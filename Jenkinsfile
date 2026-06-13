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
                    // Determinar el tag correspondiente (si hay un tag de Git se usa, de lo contrario se usa el commit SHA)
                    def targetTag = env.TAG_NAME ?: env.COMMIT_SHA

                    // 1. CONSTRUIR Y ETIQUETAR BACKEND
                    echo 'Construyendo y etiquetando imagen del Backend...'
                    sh "docker build -t ${DOCKER_HUB_USER}/${REPO_BACKEND}:${targetTag} -t ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest -f backend/Dockerfile ."
                    
                    // 2. CONSTRUIR Y ETIQUETAR FRONTEND
                    echo 'Construyendo y etiquetando imagen del Frontend...'
                    sh "docker build -t ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${targetTag} -t ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest -f frontend/Dockerfile ."
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
                    def targetTag = env.TAG_NAME ?: env.COMMIT_SHA

                    // Subir versión específica
                    sh "docker push ${DOCKER_HUB_USER}/${REPO_BACKEND}:${targetTag}"
                    sh "docker push ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${targetTag}"
                    
                    // Subir tag latest
                    sh "docker push ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest"
                    sh "docker push ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest"
                }
            }
        }

        stage('Limpieza Local') {
            steps {
                script {
                    def targetTag = env.TAG_NAME ?: env.COMMIT_SHA
                    // Eliminar imágenes locales construidas para no llenar el disco del servidor de Jenkins
                    sh "docker rmi ${DOCKER_HUB_USER}/${REPO_BACKEND}:${targetTag} || true"
                    sh "docker rmi ${DOCKER_HUB_USER}/${REPO_BACKEND}:latest || true"
                    sh "docker rmi ${DOCKER_HUB_USER}/${REPO_FRONTEND}:${targetTag} || true"
                    sh "docker rmi ${DOCKER_HUB_USER}/${REPO_FRONTEND}:latest || true"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
