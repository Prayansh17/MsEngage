from django.views.generic import TemplateView
from chat import views


class HomePage(TemplateView):
    template_name = 'index.html'

class Chat_View(TemplateView):
    template_name = 'chat/main.html'

class ThanksPage(TemplateView):
    template_name = 'thanks.html'
