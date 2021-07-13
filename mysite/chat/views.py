from django.shortcuts import render
from django.views.generic import TemplateView

# Create your views here.
def main_view(request):
    context={}
    return render(request,'chat/main.html',context=context)
class Home(TemplateView):
    template_name = 'index.html'
