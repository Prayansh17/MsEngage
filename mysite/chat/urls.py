from django.urls import path
from .views import main_view

app_name = 'chat'

urlpatterns = [
    path('',main_view,name='main_view'),
]
