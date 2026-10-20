# Imagen de build nativa (ARM64 en Raspberry Pi, o amd64 en PC/Cloud)
# JDK 21 + Android SDK + Node 22 + fastlane
FROM eclipse-temurin:21-jdk-jammy

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

# 1. Herramientas nativas del sistema + Node 22 + fastlane
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip git ca-certificates build-essential ruby-full qemu-user-static binfmt-support \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && gem install fastlane -N \
    && rm -rf /var/lib/apt/lists/*

# 2. Soporte multi-arch: configurar repositorios para separar ports.ubuntu.com (arm64) de archive.ubuntu.com (amd64)
# En Ubuntu, ports.ubuntu.com solo tiene arm64 y archive.ubuntu.com tiene amd64; si no se configuran por separado con [arch=...], da 404.
RUN dpkg --add-architecture amd64 \
    && sed -i 's/^deb /deb [arch=arm64] /' /etc/apt/sources.list \
    && cp /etc/apt/sources.list /etc/apt/sources.list.d/amd64.list \
    && sed -i 's/arch=arm64/arch=amd64/' /etc/apt/sources.list.d/amd64.list \
    && sed -i 's|ports.ubuntu.com/ubuntu-ports|archive.ubuntu.com/ubuntu|' /etc/apt/sources.list.d/amd64.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends libc6:amd64 libstdc++6:amd64 zlib1g:amd64 \
    && rm -rf /var/lib/apt/lists/*

# 3. Android command-line tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdtools.zip \
    && unzip -q /tmp/cmdtools.zip -d $ANDROID_HOME/cmdline-tools \
    && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
    && rm /tmp/cmdtools.zip \
    && yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
