/**
 * Módulo de Diseño de Automatizaciones
 * Permite configurar las automatizaciones para cada etapa de un embudo
 */

const AUTOMATION_EDITOR = (() => {
    // Configuración y variables internas
    const config = {
        currentEmbudoId: null,
        currentEtapaId: null,
        containerSelector: '#automatizaciones-container',
        emptyStateSelector: '#automatizaciones-empty',
        breadcrumbSelector: '#automatizacion-breadcrumb'
    };

    /**
     * Inicializa el módulo de automatizaciones
     * @param {Object} params - Parámetros, debe contener embudoId y etapaId
     */
    const init = async (params = {}) => {
        console.log('Inicializando módulo de Automatizaciones');

        // Si no tenemos embudo y etapa, mostrar vista vacía
        if (!params.embudoId || !params.etapaId) {
            showEmptyState();
            return;
        }

        // Guardar IDs actuales
        config.currentEmbudoId = params.embudoId;
        config.currentEtapaId = params.etapaId;

        try {
            // Cargar datos del embudo y etapa
            const embudo = await DB.getItem('embudos', params.embudoId);
            if (!embudo) {
                UTILS.showToast('Embudo no encontrado', 'error');
                showEmptyState();
                return;
            }

            // Buscar la etapa actual
            const etapa = embudo.etapas.find(e => e.id === params.etapaId);
            if (!etapa) {
                UTILS.showToast('Etapa no encontrada', 'error');
                showEmptyState();
                return;
            }

            // Actualizar breadcrumb
            updateBreadcrumb(embudo, etapa);

            // Inicializar automatizaciones si no existen
            if (!etapa.automatizaciones) {
                etapa.automatizaciones = [];
            }

            // Renderizar editor de automatizaciones
            renderAutomationEditor(embudo, etapa);
        } catch (error) {
            console.error('Error al cargar datos para el editor de automatizaciones:', error);
            UTILS.showToast('Error al cargar los datos', 'error');
            showEmptyState();
        }
    };

    /**
     * Muestra el estado vacío cuando no hay etapa seleccionada
     */
    const showEmptyState = () => {
        const container = document.querySelector(config.containerSelector);
        const emptyState = document.querySelector(config.emptyStateSelector);
        
        if (container && emptyState) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        }
        
        // Actualizar breadcrumb vacío
        updateBreadcrumb();
    };

    /**
     * Actualiza el breadcrumb con la navegación actual
     * @param {Object} embudo - Datos del embudo actual (opcional)
     * @param {Object} etapa - Datos de la etapa actual (opcional)
     */
    const updateBreadcrumb = (embudo = null, etapa = null) => {
        const breadcrumb = document.querySelector(config.breadcrumbSelector);
        
        if (!breadcrumb) return;
        
        if (!embudo || !etapa) {
            breadcrumb.innerHTML = `
                <a href="#" class="breadcrumb-item" data-action="volver-embudos">Embudos</a>
            `;
            return;
        }
        
        breadcrumb.innerHTML = `
            <a href="#" class="breadcrumb-item" data-action="volver-embudos">Embudos</a>
            <span class="separator">/</span>
            <a href="#" class="breadcrumb-item" data-action="volver-etapas" data-embudo-id="${embudo.id}">${UTILS.escapeHTML(embudo.nombre)}</a>
            <span class="separator">/</span>
            <span class="breadcrumb-current">${UTILS.escapeHTML(etapa.nombre)}</span>
        `;
        
        // Configurar eventos de navegación
        breadcrumb.querySelectorAll('[data-action="volver-embudos"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                ROUTER.navigateTo('embudos');
            });
        });
        
        breadcrumb.querySelectorAll('[data-action="volver-etapas"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const embudoId = link.getAttribute('data-embudo-id');
                handleVolverAEtapas(embudoId);
            });
        });
    };

    /**
     * Maneja el evento de volver a la vista de etapas de un embudo
     * @param {string} embudoId - ID del embudo
     */
    const handleVolverAEtapas = async (embudoId) => {
        try {
            const embudo = await DB.getItem('embudos', embudoId);
            if (!embudo) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            ROUTER.navigateTo('embudos', { view: 'detalle', embudoId });
            FUNNEL_BUILDER.renderEmbudoDetalle(embudo);
        } catch (error) {
            console.error('Error al volver a la vista de etapas:', error);
            UTILS.showToast('Error al cargar las etapas', 'error');
        }
    };

    /**
     * Renderiza el editor de automatizaciones
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     */
    const renderAutomationEditor = (embudo, etapa) => {
        const container = document.querySelector(config.containerSelector);
        const emptyState = document.querySelector(config.emptyStateSelector);
        
        if (!container) return;
        
        // Ocultar estado vacío
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Construir HTML del editor
        const html = `
            <div class="automation-editor">
                <div class="editor-section">
                    <h3>Condiciones de Activación</h3>
                    <div class="form-group">
                        <label for="condicion-activacion">¿Cuándo se activa esta automatización?</label>
                        <select id="condicion-activacion" class="form-control">
                            <option value="entrada" ${getSelectedCondition(etapa, 'entrada')}>Al entrar en la etapa</option>
                            <option value="sinActividad" ${getSelectedCondition(etapa, 'sinActividad')}>Después de X días sin actividad</option>
                        </select>
                    </div>
                    <div id="config-condicion" class="config-condicion" style="display: ${etapa.condicionTipo === 'sinActividad' ? 'block' : 'none'}">
                        <div class="form-group">
                            <label for="dias-inactividad">Días sin actividad</label>
                            <input type="number" id="dias-inactividad" min="1" value="${etapa.diasInactividad || 3}" class="form-control">
                        </div>
                    </div>
                </div>

                <div class="editor-section">
                    <div class="section-header">
                        <h3>Secuencia de Acciones</h3>
                        <button id="btn-nueva-accion" class="btn btn-primary btn-sm">
                            <i class="fas fa-plus"></i> Añadir Acción
                        </button>
                    </div>
                    <div class="sequence-container" id="secuencia-acciones">
                        ${renderSecuencia(etapa.automatizaciones)}
                    </div>
                </div>

                <div class="actions-footer">
                    <button id="btn-guardar-automatizacion" class="btn btn-primary">
                        <i class="fas fa-save"></i> Guardar Automatización
                    </button>
                </div>
            </div>
        `;
        
        // Actualizar contenedor
        container.innerHTML = html;
        
        // Configurar eventos
        setupEventListeners(embudo, etapa);
    };

    /**
     * Obtiene el atributo selected para un option en base a la condición actual
     * @param {Object} etapa - Datos de la etapa
     * @param {string} condicion - Tipo de condición a evaluar
     * @returns {string} Atributo selected o cadena vacía
     */
    const getSelectedCondition = (etapa, condicion) => {
        return (etapa.condicionTipo === condicion) ? 'selected' : '';
    };

    /**
     * Renderiza la secuencia de acciones de automatización
     * @param {Array} automatizaciones - Lista de automatizaciones
     * @returns {string} HTML de la secuencia
     */
    const renderSecuencia = (automatizaciones) => {
        if (!automatizaciones || automatizaciones.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-robot empty-icon"></i>
                    <h3>No hay acciones configuradas</h3>
                    <p>Añade acciones a tu automatización para activarla.</p>
                </div>
            `;
        }
        
        // Ordenar por orden
        const accionesOrdenadas = [...automatizaciones].sort((a, b) => a.orden - b.orden);
        
        // Renderizar cada acción
        return accionesOrdenadas.map((accion, index) => `
            <div class="sequence-step" data-accion-id="${accion.id}">
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-header">
                        <h4 class="step-title">
                            ${getAccionTipoIcon(accion.tipo)}
                            ${UTILS.escapeHTML(getAccionTipoLabel(accion.tipo))}
                        </h4>
                        <div class="step-actions">
                            <button class="btn btn-sm btn-icon btn-edit-accion" data-accion-id="${accion.id}" title="Editar acción">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-icon btn-delete-accion" data-accion-id="${accion.id}" title="Eliminar acción">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="step-body">
                        ${renderContenidoAccion(accion)}
                    </div>
                    ${index < automatizaciones.length - 1 ? `
                        <div class="step-delay">
                            <i class="fas fa-clock"></i>
                            Esperar ${accion.tiempoEspera || 0} día(s) hasta el siguiente paso
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    };

    /**
     * Obtiene el ícono para un tipo de acción
     * @param {string} tipo - Tipo de acción
     * @returns {string} HTML del ícono
     */
    const getAccionTipoIcon = (tipo) => {
        switch (tipo) {
            case 'ENVIAR_PLANTILLA':
                return '<i class="fas fa-paper-plane"></i>';
            case 'ESPERAR':
                return '<i class="fas fa-hourglass-half"></i>';
            case 'NOTIFICAR_USUARIO':
                return '<i class="fas fa-bell"></i>';
            default:
                return '<i class="fas fa-cog"></i>';
        }
    };

    /**
     * Obtiene la etiqueta para un tipo de acción
     * @param {string} tipo - Tipo de acción
     * @returns {string} Etiqueta del tipo de acción
     */
    const getAccionTipoLabel = (tipo) => {
        switch (tipo) {
            case 'ENVIAR_PLANTILLA':
                return 'Enviar Plantilla';
            case 'ESPERAR':
                return 'Esperar';
            case 'NOTIFICAR_USUARIO':
                return 'Notificar Usuario';
            default:
                return 'Acción';
        }
    };

    /**
     * Renderiza el contenido específico de una acción
     * @param {Object} accion - Datos de la acción
     * @returns {string} HTML del contenido
     */
    const renderContenidoAccion = (accion) => {
        switch (accion.tipo) {
            case 'ENVIAR_PLANTILLA':
                return `
                    <div class="plantilla-info">
                        <div class="plantilla-nombre">${accion.plantillaNombre || 'Plantilla sin nombre'}</div>
                        <div class="plantilla-tipo">${getTipoPlantillaLabel(accion.plantillaTipo)}</div>
                    </div>
                `;
            case 'ESPERAR':
                return `
                    <div class="espera-info">
                        Esperar ${accion.duracion} día(s)
                    </div>
                `;
            case 'NOTIFICAR_USUARIO':
                return `
                    <div class="notificacion-info">
                        <div class="notificacion-mensaje">${UTILS.escapeHTML(accion.mensaje || '')}</div>
                    </div>
                `;
            default:
                return `<div class="accion-generica">Acción personalizada</div>`;
        }
    };

    /**
     * Obtiene la etiqueta para un tipo de plantilla
     * @param {string} tipo - Tipo de plantilla
     * @returns {string} Etiqueta del tipo de plantilla
     */
    const getTipoPlantillaLabel = (tipo) => {
        switch (tipo) {
            case 'email':
                return 'Email';
            case 'whatsapp':
                return 'WhatsApp';
            case 'sms':
                return 'SMS';
            default:
                return tipo || 'Desconocido';
        }
    };

    /**
     * Configura los listeners de eventos para el editor
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     */
    const setupEventListeners = (embudo, etapa) => {
        // Evento para cambiar condición de activación
        const selectCondicion = document.getElementById('condicion-activacion');
        if (selectCondicion) {
            selectCondicion.addEventListener('change', () => {
                const configCondicion = document.getElementById('config-condicion');
                configCondicion.style.display = selectCondicion.value === 'sinActividad' ? 'block' : 'none';
            });
        }
        
        // Botón para añadir nueva acción
        const btnNuevaAccion = document.getElementById('btn-nueva-accion');
        if (btnNuevaAccion) {
            btnNuevaAccion.addEventListener('click', () => handleNuevaAccion(embudo, etapa));
        }
        
        // Botón para guardar automatización
        const btnGuardar = document.getElementById('btn-guardar-automatizacion');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => handleGuardarAutomatizacion(embudo, etapa));
        }
        
        // Botones para editar y eliminar acciones
        document.querySelectorAll('.btn-edit-accion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accionId = btn.getAttribute('data-accion-id');
                handleEditarAccion(embudo, etapa, accionId);
            });
        });
        
        document.querySelectorAll('.btn-delete-accion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accionId = btn.getAttribute('data-accion-id');
                handleEliminarAccion(embudo, etapa, accionId);
            });
        });
    };

    /**
     * Maneja el evento de crear nueva acción
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     */
    const handleNuevaAccion = async (embudo, etapa) => {
        try {
            // Crear modal para seleccionar tipo de acción
            const modalHtml = `
                <div class="modal-header">
                    <h3>Nueva Acción</h3>
                    <button class="btn-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="tipo-accion">Tipo de Acción</label>
                        <select id="tipo-accion" class="form-control">
                            <option value="ENVIAR_PLANTILLA">Enviar Plantilla</option>
                            <option value="ESPERAR">Esperar</option>
                            <option value="NOTIFICAR_USUARIO">Notificar Usuario</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="btn-continuar-accion">Continuar</button>
                </div>
            `;
            
            // Mostrar modal personalizado
            const modalContainer = document.getElementById('modal-container');
            const modalContent = modalContainer.querySelector('.modal');
            
            modalContent.innerHTML = modalHtml;
            modalContainer.classList.add('active');
            
            // Configurar evento para continuar
            document.getElementById('btn-continuar-accion').addEventListener('click', () => {
                const tipoAccion = document.getElementById('tipo-accion').value;
                UTILS.hideModal();
                mostrarEditorAccion(embudo, etapa, tipoAccion);
            });
            
            // Configurar eventos de cierre
            modalContainer.querySelectorAll('.btn-close, .btn-cancel').forEach(btn => {
                btn.addEventListener('click', UTILS.hideModal);
            });
            
            modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) {
                    UTILS.hideModal();
                }
            });
        } catch (error) {
            console.error('Error al crear nueva acción:', error);
            UTILS.showToast('Error al crear nueva acción', 'error');
        }
    };

    /**
     * Muestra el editor específico según el tipo de acción
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     * @param {string} tipoAccion - Tipo de acción seleccionada
     * @param {Object} accionExistente - Datos de una acción existente si es edición
     */
    const mostrarEditorAccion = async (embudo, etapa, tipoAccion, accionExistente = null) => {
        let modalHtml = `
            <div class="modal-header">
                <h3>${accionExistente ? 'Editar' : 'Nueva'} ${getAccionTipoLabel(tipoAccion)}</h3>
                <button class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
        `;
        
        // Contenido específico según tipo
        switch (tipoAccion) {
            case 'ENVIAR_PLANTILLA':
                const plantillas = await DB.getAllItems('plantillasMensajes');
                
                modalHtml += `
                    <div class="form-group">
                        <label for="plantilla-id">Seleccionar Plantilla</label>
                        <select id="plantilla-id" class="form-control" required>
                            <option value="">Seleccione una plantilla</option>
                            ${plantillas.map(p => `
                                <option value="${p.id}" ${accionExistente && accionExistente.plantillaId === p.id ? 'selected' : ''}>
                                    ${UTILS.escapeHTML(p.nombre)} (${getTipoPlantillaLabel(p.tipo)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <button id="btn-crear-plantilla" class="btn btn-outline btn-sm">
                            <i class="fas fa-plus"></i> Crear Nueva Plantilla
                        </button>
                    </div>
                    <div class="form-group">
                        <label for="tiempo-espera">Tiempo de Espera (días) hasta el siguiente paso</label>
                        <input type="number" id="tiempo-espera" class="form-control" min="0" value="${accionExistente ? accionExistente.tiempoEspera || 0 : 1}">
                    </div>
                `;
                break;
                
            case 'ESPERAR':
                modalHtml += `
                    <div class="form-group">
                        <label for="duracion">Duración de Espera (días)</label>
                        <input type="number" id="duracion" class="form-control" min="1" value="${accionExistente ? accionExistente.duracion || 1 : 1}" required>
                    </div>
                `;
                break;
                
            case 'NOTIFICAR_USUARIO':
                modalHtml += `
                    <div class="form-group">
                        <label for="mensaje">Mensaje de Notificación</label>
                        <textarea id="mensaje" class="form-control" rows="4" required>${accionExistente ? accionExistente.mensaje || '' : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="tiempo-espera">Tiempo de Espera (días) hasta el siguiente paso</label>
                        <input type="number" id="tiempo-espera" class="form-control" min="0" value="${accionExistente ? accionExistente.tiempoEspera || 0 : 1}">
                    </div>
                `;
                break;
        }
        
        modalHtml += `
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary btn-cancel">Cancelar</button>
                <button class="btn btn-primary" id="btn-guardar-accion">Guardar</button>
            </div>
        `;
        
        // Mostrar modal
        const modalContainer = document.getElementById('modal-container');
        const modalContent = modalContainer.querySelector('.modal');
        
        modalContent.innerHTML = modalHtml;
        modalContainer.classList.add('active');
        
        // Configurar eventos
        if (tipoAccion === 'ENVIAR_PLANTILLA') {
            document.getElementById('btn-crear-plantilla').addEventListener('click', () => {
                UTILS.hideModal();
                handleCrearPlantilla(embudo, etapa, tipoAccion, accionExistente);
            });
        }
        
        document.getElementById('btn-guardar-accion').addEventListener('click', () => {
            guardarAccion(embudo, etapa, tipoAccion, accionExistente);
        });
        
        // Configurar eventos de cierre
        modalContainer.querySelectorAll('.btn-close, .btn-cancel').forEach(btn => {
            btn.addEventListener('click', UTILS.hideModal);
        });
        
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                UTILS.hideModal();
            }
        });
    };

    /**
     * Maneja el evento de crear una nueva plantilla
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     * @param {string} tipoAccion - Tipo de acción
     * @param {Object} accionExistente - Datos de acción existente si es edición
     */
    const handleCrearPlantilla = (embudo, etapa, tipoAccion, accionExistente) => {
        // Mostrar modal para crear plantilla
        UTILS.showModal('modal-plantilla');
        
        // Configurar el botón de guardar plantilla
        const btnGuardarPlantilla = document.getElementById('btn-guardar-plantilla');
        if (btnGuardarPlantilla) {
            btnGuardarPlantilla.onclick = async () => {
                // Obtener datos del formulario
                const form = document.getElementById('form-plantilla');
                if (!UTILS.validateForm(form)) {
                    return;
                }
                
                const formData = UTILS.getFormData(form);
                
                try {
                    // Crear nueva plantilla
                    const plantilla = {
                        id: UTILS.generateUUID(),
                        nombre: formData.nombrePlantilla,
                        tipo: formData.tipoPlantilla,
                        texto: formData.textoPlantilla,
                        variablesSugeridas: UTILS.stringToArray(formData.variablesSugeridas),
                        fechaCreacion: Date.now()
                    };
                    
                    await DB.addItem('plantillasMensajes', plantilla);
                    UTILS.showToast('Plantilla creada correctamente', 'success');
                    
                    // Cerrar modal y volver al editor de acción
                    UTILS.hideModal();
                    mostrarEditorAccion(embudo, etapa, tipoAccion, accionExistente);
                } catch (error) {
                    console.error('Error al guardar la plantilla:', error);
                    UTILS.showToast('Error al guardar la plantilla', 'error');
                }
            };
        }
    };

    /**
     * Guarda una acción (nueva o editada)
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     * @param {string} tipoAccion - Tipo de acción
     * @param {Object} accionExistente - Datos de acción existente si es edición
     */
    const guardarAccion = async (embudo, etapa, tipoAccion, accionExistente) => {
        try {
            let datosAccion = {
                id: accionExistente ? accionExistente.id : UTILS.generateUUID(),
                tipo: tipoAccion,
                orden: accionExistente ? accionExistente.orden : etapa.automatizaciones.length
            };
            
            // Obtener datos específicos según tipo
            switch (tipoAccion) {
                case 'ENVIAR_PLANTILLA':
                    const plantillaId = document.getElementById('plantilla-id').value;
                    const tiempoEspera = parseInt(document.getElementById('tiempo-espera').value) || 0;
                    
                    if (!plantillaId) {
                        UTILS.showToast('Debe seleccionar una plantilla', 'error');
                        return;
                    }
                    
                    // Obtener datos de la plantilla
                    const plantilla = await DB.getItem('plantillasMensajes', plantillaId);
                    if (!plantilla) {
                        UTILS.showToast('Plantilla no encontrada', 'error');
                        return;
                    }
                    
                    datosAccion = {
                        ...datosAccion,
                        plantillaId,
                        plantillaNombre: plantilla.nombre,
                        plantillaTipo: plantilla.tipo,
                        tiempoEspera
                    };
                    break;
                    
                case 'ESPERAR':
                    const duracion = parseInt(document.getElementById('duracion').value);
                    if (!duracion || duracion < 1) {
                        UTILS.showToast('La duración debe ser al menos 1 día', 'error');
                        return;
                    }
                    
                    datosAccion = {
                        ...datosAccion,
                        duracion
                    };
                    break;
                    
                case 'NOTIFICAR_USUARIO':
                    const mensaje = document.getElementById('mensaje').value;
                    const tiempoEsperaNotif = parseInt(document.getElementById('tiempo-espera').value) || 0;
                    
                    if (!mensaje) {
                        UTILS.showToast('Debe ingresar un mensaje', 'error');
                        return;
                    }
                    
                    datosAccion = {
                        ...datosAccion,
                        mensaje,
                        tiempoEspera: tiempoEsperaNotif
                    };
                    break;
            }
            
            // Actualizar embudo
            const embudoActualizado = await DB.getItem('embudos', embudo.id);
            if (!embudoActualizado) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Encontrar la etapa actual
            const etapaActual = embudoActualizado.etapas.find(e => e.id === etapa.id);
            if (!etapaActual) {
                UTILS.showToast('Etapa no encontrada', 'error');
                return;
            }
            
            // Inicializar automatizaciones si no existen
            if (!etapaActual.automatizaciones) {
                etapaActual.automatizaciones = [];
            }
            
            if (accionExistente) {
                // Actualizar acción existente
                const index = etapaActual.automatizaciones.findIndex(a => a.id === accionExistente.id);
                if (index >= 0) {
                    etapaActual.automatizaciones[index] = datosAccion;
                }
            } else {
                // Añadir nueva acción
                etapaActual.automatizaciones.push(datosAccion);
            }
            
            // Guardar embudo actualizado
            await DB.updateItem('embudos', embudoActualizado);
            
            // Cerrar modal
            UTILS.hideModal();
            
            // Recargar vista
            UTILS.showToast(accionExistente ? 'Acción actualizada' : 'Acción agregada', 'success');
            init({ embudoId: embudo.id, etapaId: etapa.id });
        } catch (error) {
            console.error('Error al guardar la acción:', error);
            UTILS.showToast('Error al guardar la acción', 'error');
        }
    };

    /**
     * Maneja el evento de editar una acción existente
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     * @param {string} accionId - ID de la acción a editar
     */
    const handleEditarAccion = (embudo, etapa, accionId) => {
        try {
            // Buscar la acción por su ID
            const accion = etapa.automatizaciones.find(a => a.id === accionId);
            if (!accion) {
                UTILS.showToast('Acción no encontrada', 'error');
                return;
            }
            
            // Mostrar editor según el tipo
            mostrarEditorAccion(embudo, etapa, accion.tipo, accion);
        } catch (error) {
            console.error('Error al editar la acción:', error);
            UTILS.showToast('Error al editar la acción', 'error');
        }
    };

    /**
     * Maneja el evento de eliminar una acción
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     * @param {string} accionId - ID de la acción a eliminar
     */
    const handleEliminarAccion = async (embudo, etapa, accionId) => {
        if (!confirm('¿Está seguro de eliminar esta acción? Esta operación no se puede deshacer.')) {
            return;
        }
        
        try {
            // Actualizar embudo
            const embudoActualizado = await DB.getItem('embudos', embudo.id);
            if (!embudoActualizado) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Encontrar la etapa actual
            const etapaActual = embudoActualizado.etapas.find(e => e.id === etapa.id);
            if (!etapaActual) {
                UTILS.showToast('Etapa no encontrada', 'error');
                return;
            }
            
            // Filtrar la acción a eliminar
            etapaActual.automatizaciones = etapaActual.automatizaciones.filter(a => a.id !== accionId);
            
            // Reordenar las acciones restantes
            etapaActual.automatizaciones = etapaActual.automatizaciones.map((accion, index) => {
                return { ...accion, orden: index };
            });
            
            // Guardar embudo actualizado
            await DB.updateItem('embudos', embudoActualizado);
            
            // Recargar vista
            UTILS.showToast('Acción eliminada correctamente', 'success');
            init({ embudoId: embudo.id, etapaId: etapa.id });
        } catch (error) {
            console.error('Error al eliminar la acción:', error);
            UTILS.showToast('Error al eliminar la acción', 'error');
        }
    };

    /**
     * Maneja el evento de guardar toda la automatización
     * @param {Object} embudo - Datos del embudo
     * @param {Object} etapa - Datos de la etapa
     */
    const handleGuardarAutomatizacion = async (embudo, etapa) => {
        try {
            // Obtener condiciones de activación
            const condicionTipo = document.getElementById('condicion-activacion').value;
            let diasInactividad = 0;
            
            if (condicionTipo === 'sinActividad') {
                diasInactividad = parseInt(document.getElementById('dias-inactividad').value) || 3;
                if (diasInactividad < 1) {
                    UTILS.showToast('Los días de inactividad deben ser al menos 1', 'error');
                    return;
                }
            }
            
            // Actualizar embudo
            const embudoActualizado = await DB.getItem('embudos', embudo.id);
            if (!embudoActualizado) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Encontrar la etapa
            const etapaActual = embudoActualizado.etapas.find(e => e.id === etapa.id);
            if (!etapaActual) {
                UTILS.showToast('Etapa no encontrada', 'error');
                return;
            }
            
            // Actualizar condiciones en la etapa
            etapaActual.condicionTipo = condicionTipo;
            etapaActual.diasInactividad = diasInactividad;
            
            // Guardar embudo actualizado
            await DB.updateItem('embudos', embudoActualizado);
            
            // Mostrar mensaje de éxito
            UTILS.showToast('Automatización guardada correctamente', 'success');
            
            // Recargar la vista
            init({ embudoId: embudo.id, etapaId: etapa.id });
        } catch (error) {
            console.error('Error al guardar la automatización:', error);
            UTILS.showToast('Error al guardar la automatización', 'error');
        }
    };

    return {
        init
    };
})(); 