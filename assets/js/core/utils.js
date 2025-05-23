/**
 * Módulo de utilidades generales para la Consola de Parametrización CRM
 * Contiene funciones auxiliares reutilizables en toda la aplicación
 */

const UTILS = (() => {
    /**
     * Genera un identificador único universal (UUID v4)
     * @returns {string} UUID v4 generado
     */
    const generateUUID = () => {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };

    /**
     * Valida un formulario HTML
     * @param {HTMLFormElement} formElement - El elemento form a validar
     * @returns {boolean} True si el formulario es válido, false si no
     */
    const validateForm = (formElement) => {
        const inputs = formElement.querySelectorAll('input, select, textarea');
        let isValid = true;

        // Remover mensajes de error anteriores
        formElement.querySelectorAll('.error-message').forEach(el => el.remove());

        inputs.forEach(input => {
            input.classList.remove('error');
            
            // Validar campos requeridos
            if (input.hasAttribute('required') && !input.value.trim()) {
                markInputAsInvalid(input, 'Este campo es obligatorio');
                isValid = false;
                return;
            }

            // Validar emails si el input es de tipo email
            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    markInputAsInvalid(input, 'Email no válido');
                    isValid = false;
                    return;
                }
            }

            // Validar números si el input es de tipo number
            if (input.type === 'number' && input.value) {
                if (isNaN(Number(input.value))) {
                    markInputAsInvalid(input, 'Debe ser un número');
                    isValid = false;
                    return;
                }
                
                // Validar min y max si existen
                if (input.hasAttribute('min') && Number(input.value) < Number(input.min)) {
                    markInputAsInvalid(input, `Mínimo: ${input.min}`);
                    isValid = false;
                    return;
                }
                
                if (input.hasAttribute('max') && Number(input.value) > Number(input.max)) {
                    markInputAsInvalid(input, `Máximo: ${input.max}`);
                    isValid = false;
                    return;
                }
            }
        });

        return isValid;
    };

    /**
     * Marca un input como inválido y muestra un mensaje de error
     * @param {HTMLElement} input - El elemento input a marcar
     * @param {string} message - Mensaje de error a mostrar
     */
    const markInputAsInvalid = (input, message) => {
        input.classList.add('error');
        
        // Crear elemento de mensaje de error
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        
        // Insertar después del input o después de su label si está dentro de un form-group
        const formGroup = input.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(errorMessage);
        } else {
            input.insertAdjacentElement('afterend', errorMessage);
        }
    };

    /**
     * Procesa una plantilla HTML y la inserta en un contenedor
     * @param {string} containerId - ID del elemento donde insertar el HTML
     * @param {string} htmlContent - Contenido HTML a insertar
     */
    const renderComponent = (containerId, htmlContent) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = htmlContent;
        } else {
            console.error(`Contenedor con ID '${containerId}' no encontrado`);
        }
    };

    /**
     * Escapa los caracteres especiales en una cadena para prevenir XSS
     * @param {string} str - Cadena a escapar
     * @returns {string} Cadena escapada segura para HTML
     */
    const escapeHTML = (str) => {
        return str.replace(/[&<>"']/g, (match) => {
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeMap[match];
        });
    };

    /**
     * Formatea una fecha a formato legible en español
     * @param {Date|string|number} date - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Crea un elemento toast/notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación ('success', 'error', 'warning', 'info')
     * @param {number} duration - Duración en milisegundos antes de desaparecer
     */
    const showToast = (message, type = 'info', duration = 3000) => {
        // Crear contenedor de toasts si no existe
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Crear toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Icono según tipo
        let icon;
        switch (type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'exclamation-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
            default: icon = 'info-circle';
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <div>${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remover el toast después de 'duration' ms
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300); // Esperar a que termine la animación
        }, duration);
    };

    /**
     * Convierte un objeto en FormData
     * @param {Object} obj - Objeto a convertir
     * @returns {FormData} Objeto FormData
     */
    const objectToFormData = (obj) => {
        const formData = new FormData();
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                formData.append(key, obj[key]);
            }
        }
        
        return formData;
    };

    /**
     * Convierte FormData a un objeto simple
     * @param {FormData} formData - Objeto FormData
     * @returns {Object} Objeto resultante
     */
    const formDataToObject = (formData) => {
        const obj = {};
        
        formData.forEach((value, key) => {
            obj[key] = value;
        });
        
        return obj;
    };

    /**
     * Obtiene los datos de un formulario como objeto
     * @param {HTMLFormElement} form - Formulario HTML
     * @returns {Object} Objeto con los datos del formulario
     */
    const getFormData = (form) => {
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        return data;
    };

    /**
     * Carga una plantilla HTML desde un contenedor de plantillas
     * @param {string} templateId - ID de la plantilla
     * @returns {DocumentFragment} Fragmento DOM con la plantilla clonada
     */
    const loadTemplate = (templateId) => {
        const template = document.getElementById(templateId);
        if (!template) {
            console.error(`Plantilla con ID '${templateId}' no encontrada`);
            return document.createDocumentFragment();
        }
        
        return document.importNode(template.content || template, true);
    };

    /**
     * Muestra un modal
     * @param {string} modalId - ID del modal a mostrar
     */
    const showModal = (modalId) => {
        const modalBackdrop = document.getElementById('modal-container');
        const modalContent = document.getElementById(modalId);
        
        if (!modalBackdrop || !modalContent) {
            console.error(`Modal o backdrop no encontrado: '${modalId}'`);
            return;
        }
        
        // Limpiar el contenido actual del modal contenedor
        const modalContainer = modalBackdrop.querySelector('.modal');
        modalContainer.innerHTML = '';
        
        // Obtener el contenido de la plantilla
        const templateContent = document.getElementById(`template-${modalId}`);
        if (templateContent) {
            const content = templateContent.cloneNode(true);
            modalContainer.appendChild(content);
        }
        
        // Mostrar el backdrop
        modalBackdrop.classList.add('active');
        
        // Eventos de cierre
        const closeButtons = modalContainer.querySelectorAll('.btn-close, .btn-cancel');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                hideModal();
            });
        });
        
        // Cerrar al hacer clic en el backdrop, pero no en el modal
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                hideModal();
            }
        });
    };

    /**
     * Oculta el modal activo
     */
    const hideModal = () => {
        const modalBackdrop = document.getElementById('modal-container');
        if (modalBackdrop) {
            modalBackdrop.classList.remove('active');
        }
    };

    /**
     * Descarga un archivo como JSON
     * @param {Object} data - Datos a descargar
     * @param {string} filename - Nombre del archivo
     */
    const downloadJSON = (data, filename) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'export.json';
        a.click();
        
        URL.revokeObjectURL(url);
    };

    /**
     * Lee un archivo JSON y devuelve su contenido como objeto
     * @param {File} file - Archivo a leer
     * @returns {Promise<Object>} Promesa con el objeto JSON
     */
    const readJSONFile = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No se proporcionó ningún archivo'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    resolve(json);
                } catch (error) {
                    reject(new Error('El archivo no tiene formato JSON válido'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsText(file);
        });
    };

    /**
     * Divide un array en chunks/grupos de tamaño específico
     * @param {Array} array - Array a dividir
     * @param {number} size - Tamaño de cada chunk
     * @returns {Array} Array de arrays (chunks)
     */
    const chunkArray = (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    };

    /**
     * Convierte una cadena separada por comas en un array
     * @param {string} str - Cadena a convertir (ej. "a, b, c")
     * @returns {Array} Array resultante
     */
    const stringToArray = (str) => {
        if (!str) return [];
        return str.split(',').map(item => item.trim()).filter(Boolean);
    };

    return {
        generateUUID,
        validateForm,
        renderComponent,
        escapeHTML,
        formatDate,
        showToast,
        objectToFormData,
        formDataToObject,
        getFormData,
        loadTemplate,
        showModal,
        hideModal,
        downloadJSON,
        readJSONFile,
        chunkArray,
        stringToArray
    };
})(); 