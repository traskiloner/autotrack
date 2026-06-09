pipeline {
    agent any

    parameters {
        string(name: 'DOCKER_HUB_USER', defaultValue: 'traskiloner', description: 'Usuario o Organización de Docker Hub')
        string(name: 'REPO_BACKEND', defaultValue: 'autotrack-backend', description: 'Nombre del repositorio de Docker Hub para el Backend')
        string(name: 'REPO_FRONTEND', defaultValue: 'autotrack-frontend', description: 'Nombre del repositorio de Docker Hub para el Frontend')
    }

    environment {
        // Obtenemos los valores de los parámetros (con valores por defecto seguros para la primera ejecución)
        DOCKER_HUB_USER = "${params.DOCKER_HUB_USER ?: 'traskiloner'}"
        REPO_BACKEND = "${params.REPO_BACKEND ?: 'autotrack-backend'}"
        REPO_FRONTEND = "${params.REPO_FRONTEND ?: 'autotrack-frontend'}"
        
        // Identificador de las credenciales de Docker Hub configuradas en Jenkins
        DOCKER_HUB_CREDS_ID = 'docker-hub-credentials'
    }

    stages {
        stage('Preparar Entorno') {
            steps {
                script {
                    // Obtiene el SHA corto del commit actual para etiquetado secundario
                    sh 'git rev-parse --short HEAD > commit_sha.txt'
                    env.COMMIT_SHA = readFile('commit_sha.txt').trim()
                    
                    echo "Construyendo para el Commit SHA: ${env.COMMIT_SHA}"
                    if (env.TAG_NAME) {
                        echo "Construyendo para la Etiqueta de Git (Tag): ${env.TAG_NAME}"
                    } else {
                        echo "Construyendo para la Rama: ${env.BRANCH_NAME}"
                    }
                }
            }
        }

        stage('Compilar y Etiquetar Imágenes') {
            steps {
                script {
                    // 1. CONSTRUIR BACKEND (usando el contexto de la raíz para acceder al paquete shared)
                    echo 'Construyendo imagen del Backend...'
                    sh "docker build -t ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.COMMIT_SHA} -f backend/Dockerfile ."
                    
                    // 2. CONSTRUIR FRONTEND (usando el contexto de la raíz para acceder al paquete shared)
                    echo 'Construyendo imagen del Frontend...'
                    sh "docker build -t ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.COMMIT_SHA} -f frontend/Dockerfile ."

                    // 3. ETIQUETAR SEGÚN EL DISPARADOR
                    if (env.TAG_NAME) {
                        // Si se disparó por un Git Tag (ej. v1.0.0), etiquetamos con esa versión
                        sh "docker tag ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.COMMIT_SHA} ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.TAG_NAME}"
                        sh "docker tag ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.COMMIT_SHA} ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.TAG_NAME}"
                        
                        // Opcionalmente, etiquetamos también como latest si es una etiqueta de versión estable
                        sh "docker tag ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.COMMIT_SHA} ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest"
                        sh "docker tag ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.COMMIT_SHA} ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest"
                    } else if (env.BRANCH_NAME == 'main') {
                        // Si se compiló la rama main por un commit regular, etiquetamos como latest
                        sh "docker tag ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.COMMIT_SHA} ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest"
                        sh "docker tag ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.COMMIT_SHA} ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest"
                    }
                }
            }
        }

        stage('Subir a Docker Hub') {
            steps {
                // Iniciar sesión de forma segura usando las credenciales guardadas en Jenkins
                withCredentials([usernamePassword(credentialsId: env.DOCKER_HUB_CREDS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                }
                
                script {
                    // Subir versión identificada por el hash de commit
                    sh "docker push ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.COMMIT_SHA}"
                    sh "docker push ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.COMMIT_SHA}"
                    
                    if (env.TAG_NAME) {
                        // Subir versión específica del tag de Git
                        sh "docker push ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.TAG_NAME}"
                        sh "docker push ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.TAG_NAME}"
                        
                        // Subir latest
                        sh "docker push ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest"
                        sh "docker push ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest"
                    } else if (env.BRANCH_NAME == 'main') {
                        // Subir latest
                        sh "docker push ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest"
                        sh "docker push ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest"
                    }
                }
            }
        }

        stage('Limpieza Local') {
            steps {
                script {
                    // Eliminar imágenes locales construidas para no llenar el disco del servidor de Jenkins
                    sh "docker rmi ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.COMMIT_SHA} || true"
                    sh "docker rmi ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.COMMIT_SHA} || true"
                    
                    if (env.TAG_NAME) {
                        sh "docker rmi ${DOCKER_HUB_USER}/${REPO_BACKEND}:${env.TAG_NAME} || true"
                        sh "docker rmi ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${env.TAG_NAME} || true"
                    }
                }
            }
        }
    }
}
