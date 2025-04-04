#!/bin/bash

SERVICE_NAME="led-matrix"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function install_service() {
    echo "Installing LED Matrix service..."
    sudo cp "${SCRIPT_DIR}/${SERVICE_NAME}.service" "${SERVICE_FILE}"
    sudo systemctl daemon-reload
    sudo systemctl enable ${SERVICE_NAME}
    echo "Service installed and enabled. Use 'sudo systemctl start ${SERVICE_NAME}' to start it."
}

function uninstall_service() {
    echo "Uninstalling LED Matrix service..."
    sudo systemctl stop ${SERVICE_NAME}
    sudo systemctl disable ${SERVICE_NAME}
    sudo rm "${SERVICE_FILE}"
    sudo systemctl daemon-reload
    echo "Service uninstalled."
}

function restart_service() {
    echo "Restarting LED Matrix service..."
    sudo systemctl restart ${SERVICE_NAME}
    echo "Service restarted."
}

function status_service() {
    sudo systemctl status ${SERVICE_NAME}
}

case "$1" in
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    restart)
        restart_service
        ;;
    status)
        status_service
        ;;
    *)
        echo "Usage: $0 {install|uninstall|restart|status}"
        exit 1
        ;;
esac

exit 0 