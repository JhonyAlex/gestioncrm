/**
 * Módulo de Configuración Guiada de IA
 * Permite configurar intenciones, flujos conversacionales y la base de conocimiento
 */

const AI_CONFIGURATOR = (() => {
    // Configuración y variables internas
    const config = {
        currentConfigId: null, // Podría ser una única config global
        containerSelector: '#ia-section',
        intencionesContainer: '#intenciones-container',
        conocimientoContainer: '#conocimiento-container',
        activeTab: 'intenciones'
    };

    /**
     * Inicializa el módulo de configuración de IA
     */
    const init = async () => {
        console.log('Inicializando módulo de Configuración IA');
        
        // Configurar listeners de eventos (tabs, botones)
        setupEventListeners();
        
        // Cargar la configuración de IA existente (o crear una si no hay)
        await loadIAConfig();
        
        // Renderizar la pestaña activa
        renderActiveTab();
    };

    /**
     * Configura los listeners de eventos
     */
    const setupEventListeners = () => {
        // Listener para cambiar de pestaña
        document.querySelectorAll('#ia-section .tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                handleTabChange(tabName);
            });
        });
        
        // Listener para botones de añadir (se añadirán dinámicamente)
        // Por ejemplo, para añadir intención, FAQ, etc.
        // Ejemplo:
        // document.addEventListener('click', (e) => {
        //     if (e.target && e.target.id === 'btn-nueva-intencion') {
        //         handleNuevaIntencion();
        //     }
        // });
    };

    /**
     * Carga la configuración de IA desde la BD
     */
    const loadIAConfig = async () => {
        try {
            // Podría haber una única config global, usamos un ID fijo
            const configId = 'global_ia_config';
            let iaConfig = await DB.getItem('configuracionesIA', configId);
            
            // Si no existe, creamos una configuración inicial
            if (!iaConfig) {
                iaConfig = {
                    id: configId,
                    nombreConfig: 'Configuración Principal IA',
                    intenciones: [],
                    baseConocimiento: { textoGeneral: '', faqs: [] },
                    fechaCreacion: Date.now()
                };
                await DB.addItem('configuracionesIA', iaConfig);
            }
            
            config.currentConfigId = configId;
            
            // Guardamos los datos cargados para uso interno
            config.datosIA = iaConfig;
            
        } catch (error) {
            console.error('Error al cargar la configuración de IA:', error);
            UTILS.showToast('Error al cargar la configuración de IA', 'error');
        }
    };

    /**
     * Maneja el cambio de pestañas (Intenciones / Base de Conocimiento)
     * @param {string} tabName - Nombre de la pestaña a activar
     */
    const handleTabChange = (tabName) => {
        config.activeTab = tabName;
        
        // Actualizar clases activas en botones de pestaña
        document.querySelectorAll('#ia-section .tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });
        
        // Actualizar clases activas en contenidos de pestaña
        document.querySelectorAll('#ia-section .tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Renderizar el contenido de la pestaña activa
        renderActiveTab();
    };

    /**
     * Renderiza el contenido de la pestaña activa
     */
    const renderActiveTab = () => {
        if (config.activeTab === 'intenciones') {
            renderIntenciones();
        } else if (config.activeTab === 'conocimiento') {
            renderBaseConocimiento();
        }
    };

    /**
     * Renderiza la sección de Intenciones
     */
    const renderIntenciones = () => {
        const container = document.querySelector(config.intencionesContainer);
        if (!container) return;
        
        const intenciones = config.datosIA.intenciones || [];
        
        let html = `
            <div class="section-header">
                <h4>Lista de Intenciones</h4>
                <button id="btn-nueva-intencion" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i> Nueva Intención
                </button>
            </div>
        `;
        
        if (intenciones.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-lightbulb empty-icon"></i>
                    <h3>No hay intenciones configuradas</h3>
                    <p>Crea la primera intención para definir cómo responderá la IA.</p>
                </div>
            `;
        } else {
            html += intenciones.map(intencion => renderIntencionItem(intencion)).join('');
        }
        
        container.innerHTML = html;
        
        // Configurar listeners para botones de intenciones
        document.getElementById('btn-nueva-intencion').addEventListener('click', handleNuevaIntencion);
        
        document.querySelectorAll('.btn-edit-intencion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const intencionId = e.currentTarget.getAttribute('data-id');
                handleEditarIntencion(intencionId);
            });
        });
        
        document.querySelectorAll('.btn-delete-intencion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const intencionId = e.currentTarget.getAttribute('data-id');
                handleEliminarIntencion(intencionId);
            });
        });
    };

    /**
     * Renderiza un ítem de intención
     * @param {Object} intencion - Datos de la intención
     * @returns {string} HTML del ítem de intención
     */
    const renderIntencionItem = (intencion) => {
        return `
            <div class="intencion-item card" data-id="${intencion.id}">
                <div class="card-header">
                    <h5>${UTILS.escapeHTML(intencion.nombre)}</h5>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-icon btn-edit-intencion" data-id="${intencion.id}" title="Editar intención">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-sm btn-icon btn-delete-intencion" data-id="${intencion.id}" title="Eliminar intención">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <p><strong>Palabras Clave:</strong></p>
                    <div class="tag-container">
                        ${intencion.palabrasClave && intencion.palabrasClave.length > 0 
                            ? intencion.palabrasClave.map(kw => `<span class="tag">${UTILS.escapeHTML(kw)}</span>`).join('') 
                            : '<span class="text-muted">Ninguna</span>'}
                    </div>
                    <p class="mt-3"><strong>Flujo Conversacional:</strong> ${intencion.flujoConversacional && intencion.flujoConversacional.length > 0 ? `${intencion.flujoConversacional.length} paso(s)` : 'No definido'}</p>
                </div>
            </div>
        `;
    };

    /**
     * Maneja el evento de crear una nueva intención
     */
    const handleNuevaIntencion = () => {
        mostrarEditorIntencion();
    };

    /**
     * Maneja el evento de editar una intención
     * @param {string} intencionId - ID de la intención a editar
     */
    const handleEditarIntencion = (intencionId) => {
        const intencion = config.datosIA.intenciones.find(i => i.id === intencionId);
        if (intencion) {
            mostrarEditorIntencion(intencion);
        }
    };

    /**
     * Muestra el modal para crear o editar una intención
     * @param {Object} intencion - Datos de la intención (null si es nueva)
     */
    const mostrarEditorIntencion = (intencion = null) => {
        const modalHtml = `
            <div class="modal-header">
                <h3>${intencion ? 'Editar' : 'Nueva'} Intención</h3>
                <button class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-intencion">
                    <input type="hidden" id="intencionId" value="${intencion ? intencion.id : ''}">
                    <div class="form-group">
                        <label for="nombreIntencion">Nombre de la Intención</label>
                        <input type="text" id="nombreIntencion" class="form-control" value="${intencion ? UTILS.escapeHTML(intencion.nombre) : ''}" required placeholder="Ej: Solicitar Información">
                    </div>
                    <div class="form-group">
                        <label for="palabrasClave">Palabras Clave (separadas por coma)</label>
                        <textarea id="palabrasClave" class="form-control" rows="3" placeholder="Ej: info, producto, precio">${intencion && intencion.palabrasClave ? UTILS.escapeHTML(intencion.palabrasClave.join(', ')) : ''}</textarea>
                    </div>
                    
                    <h4>Diseñador de Flujo Conversacional</h4>
                    <div id="flujo-conversacional-container">
                        ${intencion && intencion.flujoConversacional ? renderFlujoConversacional(intencion.flujoConversacional) : renderFlujoConversacional([])}
                    </div>
                    <button type="button" id="btn-nuevo-paso" class="btn btn-outline btn-sm mt-2">
                        <i class="fas fa-plus"></i> Añadir Paso al Flujo
                    </button>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-guardar-intencion">Guardar Intención</button>
            </div>
        `;
        
        // Mostrar modal
        const modalContainer = document.getElementById('modal-container');
        const modalContent = modalContainer.querySelector('.modal');
        modalContent.innerHTML = modalHtml;
        modalContainer.classList.add('active');
        
        // Configurar listeners del modal
        document.getElementById('btn-nuevo-paso').addEventListener('click', handleNuevoPasoFlujo);
        document.getElementById('btn-guardar-intencion').addEventListener('click', handleGuardarIntencion);
        
        modalContent.querySelectorAll('.btn-delete-paso').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pasoId = e.currentTarget.getAttribute('data-paso-id');
                eliminarPasoFlujo(pasoId);
            });
        });
        
        // Configurar eventos de cierre
        modalContainer.querySelectorAll('.btn-close, .btn-cancel').forEach(btn => {
            btn.addEventListener('click', UTILS.hideModal);
        });
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) UTILS.hideModal();
        });
    };

    /**
     * Renderiza el flujo conversacional de una intención
     * @param {Array} flujo - Array de pasos del flujo
     * @returns {string} HTML del flujo conversacional
     */
    const renderFlujoConversacional = (flujo) => {
        if (!flujo || flujo.length === 0) {
            return '<p class="text-muted">Aún no hay pasos en este flujo.</p>';
        }
        
        return flujo.map((paso, index) => `
            <div class="sequence-step paso-flujo" data-paso-id="${paso.id}">
                <div class="step-number">${index + 1}</div>
                <div class="step-content">
                    <div class="step-header">
                        <select class="form-control form-control-sm tipo-paso" data-paso-id="${paso.id}">
                            <option value="MENSAJE_IA" ${paso.tipo === 'MENSAJE_IA' ? 'selected' : ''}>Mensaje IA</option>
                            <option value="ESPERAR_RESPUESTA_USUARIO" ${paso.tipo === 'ESPERAR_RESPUESTA_USUARIO' ? 'selected' : ''}>Esperar Respuesta Usuario</option>
                            <option value="RECOPILAR_DATO" ${paso.tipo === 'RECOPILAR_DATO' ? 'selected' : ''}>Recopilar Dato</option>
                            <option value="DERIVAR_ASISTENTE" ${paso.tipo === 'DERIVAR_ASISTENTE' ? 'selected' : ''}>Derivar a Asistente</option>
                            <option value="DERIVAR_HUMANO" ${paso.tipo === 'DERIVAR_HUMANO' ? 'selected' : ''}>Derivar a Humano</option>
                        </select>
                        <button type="button" class="btn btn-sm btn-icon btn-delete-paso" data-paso-id="${paso.id}" title="Eliminar paso">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="paso-contenido-editor mt-2">
                        ${renderEditorContenidoPaso(paso)}
                    </div>
                </div>
            </div>
        `).join('');
    };

    /**
     * Renderiza el editor para el contenido de un paso del flujo
     * @param {Object} paso - Datos del paso
     * @returns {string} HTML del editor de contenido
     */
    const renderEditorContenidoPaso = (paso) => {
        let html = '';
        switch (paso.tipo) {
            case 'MENSAJE_IA':
                html = `<textarea class="form-control contenido-paso" rows="2" placeholder="Escribe el mensaje de la IA...">${paso.contenido || ''}</textarea>`;
                break;
            case 'RECOPILAR_DATO':
                html = `<input type="text" class="form-control contenido-paso" placeholder="Nombre del campo a recopilar (ej: email)" value="${paso.contenido || ''}">`;
                break;
            case 'ESPERAR_RESPUESTA_USUARIO':
            case 'DERIVAR_ASISTENTE':
            case 'DERIVAR_HUMANO':
                html = '<p class="text-muted small">Este tipo de paso no requiere contenido adicional.</p>';
                break;
        }
        return html;
    };

    /**
     * Maneja la adición de un nuevo paso al flujo conversacional en el editor
     */
    const handleNuevoPasoFlujo = () => {
        const contenedorFlujo = document.getElementById('flujo-conversacional-container');
        const nuevoPaso = {
            id: UTILS.generateUUID(),
            tipo: 'MENSAJE_IA', // Tipo por defecto
            contenido: ''
        };
        
        // Simular un flujo temporal para renderizar el nuevo paso
        // Esto es solo para la UI, se guarda al final
        let flujoActualUI = [];
        document.querySelectorAll('.paso-flujo').forEach(el => {
            const pasoId = el.getAttribute('data-paso-id');
            const tipo = el.querySelector('.tipo-paso').value;
            const contenidoEl = el.querySelector('.contenido-paso');
            const contenido = contenidoEl ? contenidoEl.value : null;
            flujoActualUI.push({ id: pasoId, tipo, contenido });
        });
        flujoActualUI.push(nuevoPaso);
        
        // Actualizar el contenedor
        contenedorFlujo.innerHTML = renderFlujoConversacional(flujoActualUI);
        
        // Re-asignar listeners a los nuevos botones de eliminar
        contenedorFlujo.querySelectorAll('.btn-delete-paso').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pasoId = e.currentTarget.getAttribute('data-paso-id');
                eliminarPasoFlujo(pasoId);
            });
        });
        
        // Re-asignar listeners a los select de tipo de paso
        contenedorFlujo.querySelectorAll('.tipo-paso').forEach(select => {
            select.addEventListener('change', (e) => {
                const pasoId = e.currentTarget.getAttribute('data-paso-id');
                const nuevoTipo = e.currentTarget.value;
                actualizarEditorContenidoPaso(pasoId, nuevoTipo);
            });
        });
    };

    /**
     * Actualiza el editor de contenido de un paso cuando cambia su tipo
     * @param {string} pasoId - ID del paso
     * @param {string} nuevoTipo - Nuevo tipo del paso
     */
    const actualizarEditorContenidoPaso = (pasoId, nuevoTipo) => {
        const pasoElement = document.querySelector(`.paso-flujo[data-paso-id="${pasoId}"]`);
        if (!pasoElement) return;
        
        const editorContainer = pasoElement.querySelector('.paso-contenido-editor');
        if (!editorContainer) return;
        
        // Crear un paso temporal con el nuevo tipo para renderizar su editor
        const pasoTemporal = { id: pasoId, tipo: nuevoTipo, contenido: '' }; 
        editorContainer.innerHTML = renderEditorContenidoPaso(pasoTemporal);
    };

    /**
     * Elimina un paso del flujo conversacional en la UI del editor
     * @param {string} pasoId - ID del paso a eliminar
     */
    const eliminarPasoFlujo = (pasoId) => {
        const pasoElement = document.querySelector(`.paso-flujo[data-paso-id="${pasoId}"]`);
        if (pasoElement) {
            pasoElement.remove();
            // Actualizar numeración (opcional, pero mejora la UI)
            const contenedorFlujo = document.getElementById('flujo-conversacional-container');
            const pasosRestantes = contenedorFlujo.querySelectorAll('.paso-flujo');
            pasosRestantes.forEach((paso, index) => {
                paso.querySelector('.step-number').textContent = index + 1;
            });
            if (pasosRestantes.length === 0) {
                contenedorFlujo.innerHTML = '<p class="text-muted">Aún no hay pasos en este flujo.</p>';
            }
        }
    };

    /**
     * Maneja el guardado de una intención (nueva o existente)
     */
    const handleGuardarIntencion = async () => {
        const form = document.getElementById('form-intencion');
        if (!UTILS.validateForm(form)) {
            UTILS.showToast('Por favor, completa los campos requeridos', 'warning');
            return;
        }
        
        const intencionId = form.intencionId.value;
        const nombre = form.nombreIntencion.value;
        const palabrasClave = UTILS.stringToArray(form.palabrasClave.value);
        
        // Recolectar el flujo conversacional
        const flujoConversacional = [];
        document.querySelectorAll('#flujo-conversacional-container .paso-flujo').forEach(pasoEl => {
            const id = pasoEl.getAttribute('data-paso-id');
            const tipo = pasoEl.querySelector('.tipo-paso').value;
            const contenidoEl = pasoEl.querySelector('.contenido-paso');
            const contenido = contenidoEl ? contenidoEl.value : null;
            flujoConversacional.push({ id, tipo, contenido });
        });
        
        const nuevaIntencion = {
            id: intencionId || UTILS.generateUUID(),
            nombre,
            palabrasClave,
            flujoConversacional
        };
        
        try {
            // Actualizar la configuración global de IA
            const iaConfig = config.datosIA;
            if (intencionId) {
                // Editar existente
                const index = iaConfig.intenciones.findIndex(i => i.id === intencionId);
                if (index !== -1) {
                    iaConfig.intenciones[index] = nuevaIntencion;
                } else {
                    iaConfig.intenciones.push(nuevaIntencion); // Si no se encontró, añadir
                }
            } else {
                // Añadir nueva
                iaConfig.intenciones.push(nuevaIntencion);
            }
            
            await DB.updateItem('configuracionesIA', iaConfig);
            UTILS.showToast('Intención guardada correctamente', 'success');
            UTILS.hideModal();
            await loadIAConfig(); // Recargar config
            renderIntenciones(); // Re-renderizar lista
        } catch (error) {
            console.error('Error al guardar la intención:', error);
            UTILS.showToast('Error al guardar la intención', 'error');
        }
    };

    /**
     * Maneja la eliminación de una intención
     * @param {string} intencionId - ID de la intención a eliminar
     */
    const handleEliminarIntencion = async (intencionId) => {
        if (!confirm('¿Estás seguro de eliminar esta intención? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const iaConfig = config.datosIA;
            iaConfig.intenciones = iaConfig.intenciones.filter(i => i.id !== intencionId);
            
            await DB.updateItem('configuracionesIA', iaConfig);
            UTILS.showToast('Intención eliminada correctamente', 'success');
            await loadIAConfig(); // Recargar config
            renderIntenciones(); // Re-renderizar lista
        } catch (error) {
            console.error('Error al eliminar la intención:', error);
            UTILS.showToast('Error al eliminar la intención', 'error');
        }
    };

    /**
     * Renderiza la sección de Base de Conocimiento
     */
    const renderBaseConocimiento = () => {
        const container = document.querySelector(config.conocimientoContainer);
        if (!container) return;
        
        const conocimiento = config.datosIA.baseConocimiento || { textoGeneral: '', faqs: [] };
        
        let html = `
            <form id="form-conocimiento">
                <div class="form-group">
                    <label for="textoGeneral">Información General del Negocio</label>
                    <textarea id="textoGeneral" class="form-control" rows="6" placeholder="Describe tu negocio, productos, servicios, etc.">${UTILS.escapeHTML(conocimiento.textoGeneral)}</textarea>
                </div>
                
                <div class="section-header mt-4">
                    <h4>Preguntas Frecuentes (FAQs)</h4>
                    <button type="button" id="btn-nueva-faq" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus"></i> Nueva FAQ
                    </button>
                </div>
                <div id="faqs-container">
                    ${conocimiento.faqs && conocimiento.faqs.length > 0 ? conocimiento.faqs.map(faq => renderFAQItem(faq)).join('') : '<p class="text-muted">No hay FAQs definidas.</p>'}
                </div>
                
                <div class="actions-footer mt-4">
                    <button type="button" id="btn-guardar-conocimiento" class="btn btn-primary">
                        <i class="fas fa-save"></i> Guardar Base de Conocimiento
                    </button>
                </div>
            </form>
        `;
        
        container.innerHTML = html;
        
        // Configurar listeners
        document.getElementById('btn-nueva-faq').addEventListener('click', handleNuevaFAQ);
        document.getElementById('btn-guardar-conocimiento').addEventListener('click', handleGuardarConocimiento);
        
        container.querySelectorAll('.btn-delete-faq').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const faqId = e.currentTarget.getAttribute('data-id');
                eliminarFAQ(faqId);
            });
        });
    };

    /**
     * Renderiza un ítem de FAQ en el editor
     * @param {Object} faq - Datos de la FAQ
     * @returns {string} HTML del ítem de FAQ
     */
    const renderFAQItem = (faq) => {
        return `
            <div class="faq-item card mb-3" data-id="${faq.id}">
                <div class="card-body">
                    <div class="form-group">
                        <label for="pregunta-${faq.id}">Pregunta</label>
                        <input type="text" id="pregunta-${faq.id}" class="form-control faq-pregunta" value="${UTILS.escapeHTML(faq.pregunta)}" placeholder="Escribe la pregunta">
                    </div>
                    <div class="form-group">
                        <label for="respuesta-${faq.id}">Respuesta</label>
                        <textarea id="respuesta-${faq.id}" class="form-control faq-respuesta" rows="3" placeholder="Escribe la respuesta">${UTILS.escapeHTML(faq.respuesta)}</textarea>
                    </div>
                    <button type="button" class="btn btn-danger btn-sm btn-delete-faq" data-id="${faq.id}">Eliminar FAQ</button>
                </div>
            </div>
        `;
    };

    /**
     * Maneja la adición de una nueva FAQ al editor
     */
    const handleNuevaFAQ = () => {
        const faqsContainer = document.getElementById('faqs-container');
        const nuevaFAQ = {
            id: UTILS.generateUUID(),
            pregunta: '',
            respuesta: ''
        };
        
        // Quitar mensaje de "No hay FAQs" si existe
        const emptyMessage = faqsContainer.querySelector('.text-muted');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        const faqElement = document.createElement('div');
        faqElement.innerHTML = renderFAQItem(nuevaFAQ);
        faqsContainer.appendChild(faqElement.firstChild);
        
        // Configurar listener para el nuevo botón de eliminar
        faqsContainer.querySelector(`.btn-delete-faq[data-id="${nuevaFAQ.id}"]`).addEventListener('click', (e) => {
            const faqId = e.currentTarget.getAttribute('data-id');
            eliminarFAQ(faqId);
        });
    };

    /**
     * Elimina una FAQ del editor
     * @param {string} faqId - ID de la FAQ a eliminar
     */
    const eliminarFAQ = (faqId) => {
        const faqElement = document.querySelector(`.faq-item[data-id="${faqId}"]`);
        if (faqElement) {
            faqElement.remove();
        }
        
        const faqsContainer = document.getElementById('faqs-container');
        if (faqsContainer.children.length === 0) {
            faqsContainer.innerHTML = '<p class="text-muted">No hay FAQs definidas.</p>';
        }
    };

    /**
     * Maneja el guardado de la Base de Conocimiento
     */
    const handleGuardarConocimiento = async () => {
        const textoGeneral = document.getElementById('textoGeneral').value;
        const faqs = [];
        
        document.querySelectorAll('#faqs-container .faq-item').forEach(item => {
            const id = item.getAttribute('data-id');
            const pregunta = item.querySelector('.faq-pregunta').value;
            const respuesta = item.querySelector('.faq-respuesta').value;
            if (pregunta && respuesta) { // Solo guardar si ambos campos tienen valor
                faqs.push({ id, pregunta, respuesta });
            }
        });
        
        try {
            const iaConfig = config.datosIA;
            iaConfig.baseConocimiento = { textoGeneral, faqs };
            
            await DB.updateItem('configuracionesIA', iaConfig);
            UTILS.showToast('Base de Conocimiento guardada correctamente', 'success');
            await loadIAConfig(); // Recargar config
            renderBaseConocimiento(); // Re-renderizar
        } catch (error) {
            console.error('Error al guardar la Base de Conocimiento:', error);
            UTILS.showToast('Error al guardar la Base de Conocimiento', 'error');
        }
    };

    // Exponer funciones públicas
    return {
        init
    };
})(); 