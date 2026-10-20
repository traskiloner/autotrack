# Imagen de build nativa (ARM64 en Raspberry Pi, o amd64 en PC/Cloud)
# JDK 21 + Android SDK + Node 22 + fastlane
FROM eclipse-temurin:21-jdk-jammy

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8
ENV PATH=$PATH:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools

# Instalamos herramientas nativas + qemu-user-static (para permitir ejecutar binarios x86_64 como aapt2 de forma transparente)
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip git ca-certificates build-essential ruby-full qemu-user-static binfmt-support \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && gem install fastlane -N \
    && rm -rf /var/lib/apt/lists/*

# Android command-line tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdtools.zip \
    && unzip -q /tmp/cmdtools.zip -d $ANDROID_HOME/cmdline-tools \
    && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
    && rm /tmp/cmdtools.zip \
    && yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
