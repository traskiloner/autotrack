# Pipeline de Android (Jenkins → Google Play)

Guía para configurar desde cero el pipeline definido en [`Jenkinsfile.android`](../Jenkinsfile.android).
Compila el AAB firmado de la app Android (Capacitor) y lo sube a Google Play.

> El pipeline de web (`Jenkinsfile`) es independiente y no se ve afectado.

## 1. Cómo funciona

```
Preparar versión → Dependencias → Build web + cap sync → Compilar AAB firmado → Archivar → Subir a Google Play
```

| Pieza | Fichero | Función |
|---|---|---|
| Pipeline | `Jenkinsfile.android` | Orquesta todos los pasos |
| Imagen de build | `frontend/android/ci/Dockerfile` | JDK 21, Android SDK 36, Node 22, fastlane |
| Gradle | `frontend/android/app/build.gradle` | Lee versión y firma de variables de entorno |

### Variables de entorno que lee Gradle

| Variable | Uso |
|---|---|
| `ANDROID_VERSION_CODE` | `versionCode` (por defecto 2 en local) |
| `ANDROID_VERSION_NAME` | `versionName` (por defecto 1.1 en local) |
| `ANDROID_KEYSTORE_PATH` | Ruta del `.jks`. Si no existe, el build no se firma |
| `ANDROID_KEYSTORE_PASSWORD` | Contraseña del keystore |
| `ANDROID_KEY_ALIAS` | Alias de la clave |
| `ANDROID_KEY_PASSWORD` | Contraseña de la clave |

## 2. Requisitos

- Jenkins con **Docker** disponible en el nodo (el pipeline construye la imagen de `frontend/android/ci/Dockerfile`).
- Plugins de Jenkins: *Docker Pipeline*, *Credentials Binding*, y *Pipeline* (y *Multibranch* si se usa).
- Cuenta de **Google Play Console** con la app ya creada.
- Unos 6–8 GB de disco libres para la imagen y la caché de Gradle.

## 3. Keystore de firma

Se necesita la clave con la que se firman las subidas a Play.

- Si ya publicaste la app: usa tu **clave de subida** actual.
- Si no tienes ninguna, genera una (y **guárdala en un lugar seguro, con copia de seguridad**):

```bash
keytool -genkeypair -v -keystore autotrack-upload.jks -alias autotrack \
  -keyalg RSA -keysize 2048 -validity 10000
```

> Nunca subas el `.jks` ni las contraseñas al repositorio.
> Se recomienda activar **Play App Signing** en Play Console: si pierdes la clave de subida, Google permite restablecerla.

## 4. Cuenta de servicio de Google Play

1. En [Google Cloud Console](https://console.cloud.google.com/) crea (o elige) un proyecto.
2. Activa la API **Google Play Android Developer API**.
3. *IAM y administración → Cuentas de servicio → Crear cuenta de servicio*. Crea una clave **JSON** y descárgala.
4. En [Play Console](https://play.google.com/console) → *Usuarios y permisos* → *Invitar usuarios nuevos*:
   - Introduce el correo de la cuenta de servicio.
   - Dale permisos sobre la app de AutoTrack: *Publicar versiones* (releases) como mínimo.
5. Los permisos pueden tardar un rato en propagarse.

## 5. Credenciales en Jenkins

*Manage Jenkins → Credentials → (global) → Add Credentials*. Los **IDs deben coincidir exactamente**:

| ID | Tipo | Contenido |
|---|---|---|
| `android-keystore` | Secret file | El `.jks` |
| `android-keystore-password` | Secret text | Contraseña del keystore |
| `android-key-alias` | Secret text | Alias de la clave |
| `android-key-password` | Secret text | Contraseña de la clave |
| `play-service-account-json` | Secret file | JSON de la cuenta de servicio |

## 6. Crear el job

1. *New Item → Multibranch Pipeline* (o *Pipeline*).
2. Fuente: el repositorio Git de AutoTrack.
3. *Build Configuration → Mode: by Jenkinsfile → Script Path:* `Jenkinsfile.android`.
4. En Multibranch, activa *Discover tags* para que se construyan los tags `v*`.
5. (Opcional) Un trigger de webhook/GitHub solo para tags, para no publicar en cada commit.

## 7. Parámetros del job

| Parámetro | Por defecto | Descripción |
|---|---|---|
| `PLAY_TRACK` | `alpha` | `alpha` = **prueba cerrada**, `internal` = prueba interna, `beta` = prueba abierta, `production` = producción, `custom` = track cerrado con nombre propio |
| `CUSTOM_TRACK` | _(vacío)_ | Solo con `PLAY_TRACK=custom`: nombre exacto del track cerrado creado en Play Console |
| `UPLOAD_TO_PLAY` | `true` | Si es `false`, solo compila y archiva el AAB |
| `VERSION_CODE_OFFSET` | `2` | Se suma al nº de build para obtener el `versionCode` |

El `versionCode` final es `BUILD_NUMBER + VERSION_CODE_OFFSET`. **Debe ser siempre mayor que el último subido a Play.**
Si Play lo rechaza (“Version code already used”), sube el offset.

El `versionName` se toma del tag: `v1.2.0` → `1.2.0`. Sin tag, se usa `1.1-<build>`.

## 8. Flujo de publicación recomendado

1. Haz *merge* de los cambios y crea un tag: `git tag v1.2.0 && git push origin v1.2.0`.
2. Jenkins construye y sube al track `internal`.
3. Prueba la versión en Play Console (pruebas internas).
4. Promociona a producción desde Play Console, o relanza con `PLAY_TRACK=production`.

## 9. Primera vez (importante)

- La **primera versión** de la app en Play Console debe subirse **a mano** (la API solo funciona con apps ya creadas y con la ficha completada).
- Los metadatos (textos, capturas, changelogs) no se suben desde el pipeline: se gestionan en Play Console.

## 10. Probar el build en local

Sin firma (usa los valores por defecto):

```bash
cd frontend
npm run cap:build
cd android && ./gradlew bundleRelease
```

Con firma y versión, como en CI:

```bash
export ANDROID_KEYSTORE_PATH=/ruta/autotrack-upload.jks
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=autotrack
export ANDROID_KEY_PASSWORD=...
export ANDROID_VERSION_CODE=10
export ANDROID_VERSION_NAME=1.2.0
./gradlew bundleRelease
```

El AAB queda en `frontend/android/app/build/outputs/bundle/release/app-release.aab`.

## 11. Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `Version code X has already been used` | Sube `VERSION_CODE_OFFSET` |
| `The caller does not have permission` | La cuenta de servicio no tiene permisos en Play Console, o aún no se han propagado |
| `Package not found` | La app aún no existe en Play Console o el `package_name` no coincide (`com.traskiloner.autotrack`) |
| `Keystore was tampered with` / contraseña incorrecta | Credenciales de keystore/clave mal configuradas en Jenkins |
| El AAB sale sin firmar | No llegó `ANDROID_KEYSTORE_PATH`: revisa los IDs de credenciales |
| `docker: command not found` | El nodo de Jenkins no tiene Docker |
| Build muy lento | Comprueba que el volumen `gradle-cache` se monta (`args` del agente) |
| Fallo de SDK/licencias | Actualiza versiones de plataforma/build-tools en `frontend/android/ci/Dockerfile` (deben coincidir con `compileSdkVersion` de `variables.gradle`) |

## 12. Mantenimiento

- Al subir `compileSdkVersion` en `frontend/android/variables.gradle`, actualiza `platforms;android-XX` y `build-tools` en el Dockerfile de CI.
- Capacitor y AGP requieren JDK 21; si cambian los requisitos, actualiza la imagen base.
- Renueva la clave de la cuenta de servicio y actualiza la credencial `play-service-account-json` si la rotas.
