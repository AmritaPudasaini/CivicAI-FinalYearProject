from django.urls import path

from . import views

urlpatterns = [
    path("complaints/", views.ComplaintListCreateView.as_view()),
    path("complaints/<int:pk>/", views.ComplaintDetailView.as_view()),
    path("complaints/<int:pk>/status/", views.ComplaintStatusView.as_view()),
]