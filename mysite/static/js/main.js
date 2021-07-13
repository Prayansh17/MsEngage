// map peer usernames to corresponding RTCPeerConnections
// as key value pairs
var mapPeers = {};

var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');
var username;
var webSocket;

function webSocketOnMessage(event) {
    var parsedData = JSON.parse(event.data);

    // username of other peer
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    if (username == peerUsername) {
        return;
    }

    // channel name of the sender of this message
    // used to send messages back to that sender
    // hence, receiver_channel_name
    var receiver_channel_name = parsedData['message']['receiver_channel_name'];

    // in case of new peer
    if (action == 'new-peer') {
        // create new RTCPeerConnection
        createOfferer(peerUsername, receiver_channel_name);
        return;
    }
    if (action == 'new-offer') {
        // create new RTCPeerConnection
        // set offer as remote description
        var offer = parsedData['message']['sdp'];
        createAnswerer(offer, peerUsername, receiver_channel_name);
        return;
    }
    if (action == 'new-answer') {
        // get the answer
        var answer = parsedData['message']['sdp'];
        var peer = mapPeers[peerUsername][0];

        // set remote description of the RTCPeerConnection
        peer.setRemoteDescription(answer);
        return;
    }
}


// set username
// join room (initiate websocket connection)
// upon button click
btnJoin.addEventListener('click', () => {
    username = usernameInput.value;
    console.log('username: ', username);
    if (username == '') {
        return;
    }

    //clear input
    usernameInput.value = '';
    // disable and vanish input
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;

    var loc = window.location;
    var wsStart = 'ws://';

    if (loc.protocol == 'https:') {
        wsStart = 'wss://';
    }
    var endPoint = wsStart + loc.host + loc.pathname;
    console.log(endPoint);

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e) => {
        console.log('Connection opened');
        // notify other peers
        sendSignal('new-peer', {});
    });
    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', (e) => {
        console.log('Connection closed');
    });
    webSocket.addEventListener('error', (e) => {
        console.log('Error occured!');
    });
});

var localStream = new MediaStream();

const constraints = {
    'video': true,
    'audio': true
};

const localVideo = document.querySelector('#local-video');

// buttons to toggle self audio and video
const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');


//toggling audio and video functions
var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

        // unmute audio and video by default
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;

            if (audioTracks[0].enabled) {
                btnToggleAudio.style.background = '#5f6368';
                return;
            }
            btnToggleAudio.style.background = 'red';
        });

        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;

            if (videoTracks[0].enabled) {
                btnToggleVideo.style.background = '#5f6368';
                return;
            }
            btnToggleVideo.style.background = 'red';
        });
    })
    .catch(error => {
        console.log('Error accessing media devices', error);
    });

var btnSendMsg = document.querySelector('#btn-chat');
var messageList = document.querySelector('#message-list');
var messageInput = document.querySelector('#btn-input')
btnSendMsg.addEventListener('click', sendMsgOnClick);

function sendMsgOnClick() {
    var message = messageInput.value;
    if(message == ''){return;}
    var li = document.createElement('li');
    li.style.float = 'right';
    li.style.margin = '20px';
    li.appendChild(document.createTextNode('Me: ' + message));
    messageList.appendChild(li);

    var dataChannels = getDataChannels();
    message = username + ': ' + message;

    // send to all data channels
    for (index in dataChannels) {
        dataChannels[index].send(message);
    }
    messageInput.value = '';

}

// send the given action and message
// over the websocket connection
function sendSignal(action, message) {
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
    });
    webSocket.send(jsonStr);
}


// create RTCPeerConnection as offerer
// and store it and its datachannel
// send sdp to remote peer after gathering is complete
function createOfferer(peerUsername, receiver_channel_name) {
    var peer = new RTCPeerConnection(null);

    // add local user media stream tracks
    addLocalTracks(peer);

    // create and manage an RTCDataChannel
    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('Connection opened!');
    });
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    // store the RTCPeerConnection
    // and the corresponding RTCDataChannel
    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];
            if (iceConnectionState != 'closed') {
                peer.close();
            }
            removeVideo(remoteVideo);
        }
    });


    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log('New ice candidate: ', JSON.stringify(peer.localDescription));
            return;
        }

        console.log('Gathering finished! Sending offer SDP to ', peerUsername, '.');
        console.log('receiverChannelName: ', receiver_channel_name);
        // send offer to new peer
        // after ice candidate gathering is complete
        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name
        });
    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log('Local description set successfully!');
        });
}




// create RTCPeerConnection as answerer
// and store it and its datachannel
// send sdp to remote peer after gathering is complete
function createAnswerer(offer, peerUsername, receiver_channel_name) {
    var peer = new RTCPeerConnection(null);
    addLocalTracks(peer);

    // set remote video
    var remoteVideo = createVideo(peerUsername);
    // and add tracks to remote video
    setOnTrack(peer, remoteVideo);

    // it will have an RTCDataChannel
    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {
            console.log('Connection opened!');
        });

        // store the RTCPeerConnection and the corresponding RTCDataChannel
        // after the RTCDataChannel is ready
        // otherwise, peer.dc may be undefined
        // as peer.ondatachannel would not be called yet
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
    });

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceConnectionState = peer.iceConnectionState;
        if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
            delete mapPeers[peerUsername];
            if (iceConnectionState != 'closed') {
                peer.close();
            }
            removeVideo(remoteVideo);
        }
    });


    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            console.log('New ice candidate: ', JSON.stringify(peer.localDescription));
            return;
        }
        // send answer to offering peer
        // after ice candidate gathering is complete
        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name
        });
    });

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('Remote description set successfully for %s', peerUsername);
            return peer.createAnswer();
        })
        .then(a => {
            console.log('Answer created!');
            peer.setLocalDescription(a);
        })
}


// called to add appropriate tracks to peer
function addLocalTracks(peer) {

    // add user media tracks
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });
    return;
}


function dcOnMessage(event) {
    var message = event.data;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}


// get all stored data channels
function getDataChannels() {
    var dataChannels = [];
    for (peerUsername in mapPeers) {
        var dataChannel = mapPeers[peerUsername][1];
        dataChannels.push(dataChannel);
    }
    return dataChannels;
}



// for every new peer
// create a new video element and its corresponding user gesture button
// assign ids corresponding to the username of the remote peer
function createVideo(peerUsername) {
    var videoContainer = document.querySelector('#video-container');
    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    var x = window.innerWidth;
    // wrapper for the video and button elements
    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);

    //grid styling for created video elements
    videoContainer.style.display = 'grid';
    videoContainer.style.gridTemplateColumns = 'auto auto';
    videoContainer.style.marginTop = '10px';
    videoContainer.style.objectFit = 'cover';
    videoContainer.style.gridTemplateRows = '400px 400px';
    console.log(x);
    if (x < 800) {
        videoContainer.style.gridTemplateRows = '220px 220px';
    }


    return remoteVideo;
}

// set onTrack for RTCPeerConnection
// to add remote tracks to remote stream
// to show video through corresponding remote video element
function setOnTrack(peer, remoteVideo) {
    var remoteStream = new MediaStream();

    // assign remoteStream as the source for remoteVideo
    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function removeVideo(video) {
    // get the video wrapper
    var videoWrapper = video.parentNode;

    // remove it
    videoWrapper.parentNode.removeChild(videoWrapper);
}
