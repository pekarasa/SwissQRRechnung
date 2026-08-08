FROM mcr.microsoft.com/vscode/devcontainers/python:3.11

# Install additional OS packages if needed
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends build-essential

# Install Python dependencies
RUN pip install --upgrade pip \
    && pip install pandas watchdog requests odfpy xlrd
