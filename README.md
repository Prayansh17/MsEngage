This is Microsoft Teams Clone Project made for Microsoft Engage program.

Description : This project is made by signaling WebRTC SDPs using websockets and django-channels
              to make multi-peer video conferencing website.

Go to the desired folder and run the command -- git clone https://github.com/Prayansh17/MsEngage.git
                        (or directly download zip folder)


A machine is required with latest version of python(3.9) installed in it(anaconda is preferable)

Running the webapp on local machine:

    1. Go to the directory with requirements.txt file(root directory) and run the command  : python -m venv VirtualEnv       (creating a virtual enviroment)

    2. After a VirtualEnv directory is created,
        run the command for windows: VirtualEnv\Scripts\activate.bat   (In the same directory)
        run the command for Unix or MacOS: source VirtualEnv/bin/activate

    3. Ensure latest version of pip by running: python -m pip install --upgrade pip
    4. Install the dependencies by running the command: pip install -r requirements.txt

    5. From the directory where we have installed VirtualEnv, go to the mysite directory by running the command: cd mysite
    6. Now run command: python manage.py makemigrations chat
    7. Now run command: python manage.py migrate

    8. To start the development server, run the command: python manage.py runserver
    9. On local device, go to local host (http://127.0.0.1:8000/)

    10. Now homepage of the website should be loaded.
    11. Signup and Login with some credentials.
    12. After login chat page should be loaded.
    13. Join the room with different joining names and the users will be connected.


For testing on multiple devices using same LAN. For that we need to make our localhost public. For that, download ngrok from https://ngrok.com/download and install it.

For testing on multiple devices in the same LAN, go to the directory where you have installed ngrok.
Run the command: ngrok.exe http 8000
This will make our localhost public and provide two public URLs. However, make sure to always use the one that starts with https: and not http: as we will be accessing media devices.

It is requested to please read Explaination.txt file to understand the full structure of the project and
how it is implemented.

For any kind of error refer to console in the browser.
