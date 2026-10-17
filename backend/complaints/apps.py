import os
import sys

from django.apps import AppConfig


class ComplaintsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "complaints"

    def ready(self):
        is_runserver = "runserver" in sys.argv
        is_server_process = os.environ.get("RUN_MAIN") == "true" or "--noreload" in sys.argv
        if is_runserver and is_server_process:
            from . import services
            services.preload_models()