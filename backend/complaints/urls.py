from django.urls import path
from . import auth_views

from . import views

urlpatterns = [
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),

    path("auth/citizen/send-otp/", auth_views.CitizenSendOTPView.as_view()),
    path("auth/citizen/verify-otp/", auth_views.CitizenVerifyOTPView.as_view()),

    path("complaints/", views.ComplaintListCreateView.as_view()),
    path("complaints/<int:pk>/", views.ComplaintDetailView.as_view()),
    path("complaints/<int:pk>/status/", views.ComplaintStatusView.as_view()),
    path("stats/", views.StatsView.as_view()),
    path("track/<str:code>/", views.TrackView.as_view()),
]