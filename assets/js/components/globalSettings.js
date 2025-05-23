/**
 * Módulo de Configuración Global
 * Gestiona configuraciones generales de la aplicación y módulos de planificación como Lead Scoring.
 */

const GLOBAL_SETTINGS = (() => {
    // Configuración y variables internas
    const config = {
        settingsId: 'settings', // ID único para el objeto de configuración global en IndexedDB
        containerSelector: '#configuracion-container',
        leadScoringContainerSelector: '#lead-scoring-settings',
        // Más selectores según sea necesario para otros módulos
        datosGlobales: null
    };

    /**
     * Inicializa el módulo de Configuración Global.
     */
    const init = async () => {
        console.log('Inicializando módulo de Configuración Global');
        if (!document.querySelector(config.containerSelector)) {
            console.warn('Contenedor de configuración global no encontrado en el DOM. Saltando inicialización.');
            return;
        }
        await loadGlobalSettings();
        renderConfiguracionPage();
        setupEventListeners();
    };

    /**
     * Carga las configuraciones globales desde IndexedDB.
     */
    const loadGlobalSettings = async () => {
        try {
            let settings = await DB.getItem('configuracionGlobal', config.settingsId);
            if (!settings) {
                console.log('No se encontró configuración global, creando una por defecto.');
                settings = {
                    id: config.settingsId,
                    ultimoEmbudSeleccionado: null,
                    preferenciasUI: {},
                    leadScoring: {
                        reglas: []
                    },
                    agendamiento: {
                        disponibilidad: [],
                        duracionReunion: 30
                    }
                    // Otros módulos de planificación pueden añadir sus configuraciones aquí
                };
                await DB.addItem('configuracionGlobal', settings);
            }
            config.datosGlobales = settings;
        } catch (error) {
            console.error('Error al cargar la configuración global:', error);
            UTILS.showToast('Error al cargar la configuración global', 'error');
            // Inicializar con datos por defecto en caso de error para que la UI no falle
            config.datosGlobales = {
                id: config.settingsId,
                leadScoring: { reglas: [] },
                agendamiento: { disponibilidad: [], duracionReunion: 30 }
            };
        }
    };

    /**
     * Renderiza la página principal de configuración.
     */
    const renderConfiguracionPage = () => {
        const container = document.querySelector(config.containerSelector);
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section mb-4">
                <h3>Lead Scoring</h3>
                <div id="lead-scoring-settings">
                    <!-- Contenido de Lead Scoring se renderizará aquí -->
                </div>
            </div>
            <hr>
            <div class="settings-section mt-4">
                <h3>Agendamiento</h3>
                <div id="agendamiento-settings">
                    <!-- Contenido de Agendamiento se renderizará aquí -->
                </div>
            </div>
            <!-- Otras secciones de configuración aquí -->
        `;
        renderLeadScoringSection();
        renderAgendamientoSection();
    };

    /**
     * Configura los listeners de eventos generales para la página de configuración.
     */
    const setupEventListeners = () => {
        // Delegación de eventos para botones añadidos dinámicamente
        const container = document.querySelector(config.containerSelector);
        if (!container) return;

        container.addEventListener('click', async (event) => {
            if (event.target.matches('#btn-nueva-regla-ls')) {
                handleNuevaReglaLeadScoring();
            }
            if (event.target.closest('.btn-edit-regla-ls')) {
                const reglaId = event.target.closest('.btn-edit-regla-ls').getAttribute('data-id');
                handleEditarReglaLeadScoring(reglaId);
            }
            if (event.target.closest('.btn-delete-regla-ls')) {
                const reglaId = event.target.closest('.btn-delete-regla-ls').getAttribute('data-id');
                await handleEliminarReglaLeadScoring(reglaId);
            }
        });
    };

    // --- SECCIÓN DE LEAD SCORING ---

    /**
     * Renderiza la sección de configuración de Lead Scoring.
     */
    const renderLeadScoringSection = () => {
        const lsContainer = document.getElementById('lead-scoring-settings');
        if (!lsContainer) return;

        const reglas = config.datosGlobales.leadScoring?.reglas || [];

        let html = `
            <p>Define reglas para puntuar automáticamente a tus leads basados en sus acciones.</p>
            <div class="section-header">
                <h4>Reglas de Puntuación</h4>
                <button id="btn-nueva-regla-ls" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus"></i> Nueva Regla
                </button>
            </div>
        `;

        if (reglas.length === 0) {
            html += '<div class="empty-state"><p>No hay reglas de lead scoring definidas.</p></div>';
        } else {
            html += '<ul class="list-group mt-3">';
            reglas.forEach(regla => {
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${UTILS.escapeHTML(regla.descripcion)}</strong>: ${regla.puntos} puntos
                            <br><small class="text-muted">Condición: ${getCondicionLeadScoringLabel(regla.tipoCondicion, regla)}</small>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-icon btn-edit-regla-ls" data-id="${regla.id}" title="Editar Regla"><i class="fas fa-pen"></i></button>
                            <button class="btn btn-sm btn-icon btn-delete-regla-ls" data-id="${regla.id}" title="Eliminar Regla"><i class="fas fa-trash"></i></button>
                        </div>
                    </li>
                `;
            });
            html += '</ul>';
        }
        lsContainer.innerHTML = html;
    };
    
    /**
     * Obtiene una etiqueta descriptiva para una condición de lead scoring.
     * @param {string} tipoCondicion - El tipo de condición.
     * @param {Object} regla - El objeto regla completo para obtener detalles adicionales.
     * @returns {string} Etiqueta descriptiva.
     */
    const getCondicionLeadScoringLabel = (tipoCondicion, regla) => {
        switch (tipoCondicion) {
            case 'EMAIL_OPENED':
                return `Email Abierto (Campaña: ${regla.campaignId || 'Cualquiera'})`;
            case 'PAGE_VISIT':
                return `Visita Página (URL contiene: ${regla.urlContains || '-'})`;
            case 'FORM_SUBMITTED':
                return `Formulario Enviado (ID: ${regla.formId || 'Cualquiera'})`;
            // Añadir más tipos de condiciones aquí
            default:
                return tipoCondicion;
        }
    };

    /**
     * Muestra el modal/formulario para añadir o editar una regla de Lead Scoring.
     * @param {Object|null} reglaParaEditar - La regla a editar, o null si es nueva.
     */
    const mostrarEditorReglaLeadScoring = (reglaParaEditar = null) => {
        const esNueva = !reglaParaEditar;
        const reglaId = esNueva ? UTILS.generateUUID() : reglaParaEditar.id;

        // Usar la plantilla del index.html o generar el HTML aquí
        const modalContainer = document.getElementById('modal-container');
        const modal = modalContainer.querySelector('.modal');

        modal.innerHTML = `
            <div class="modal-header">
                <h3>${esNueva ? 'Nueva' : 'Editar'} Regla de Lead Scoring</h3>
                <button class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="form-regla-ls">
                    <input type="hidden" id="reglaLsId" value="${reglaId}">
                    <div class="form-group">
                        <label for="reglaLsDescripcion">Descripción de la Regla</label>
                        <input type="text" id="reglaLsDescripcion" class="form-control" value="${reglaParaEditar?.descripcion || ''}" required placeholder="Ej: Abrió email de bienvenida">
                    </div>
                    <div class="form-group">
                        <label for="reglaLsPuntos">Puntos</label>
                        <input type="number" id="reglaLsPuntos" class="form-control" value="${reglaParaEditar?.puntos || 5}" required>
                    </div>
                    <div class="form-group">
                        <label for="reglaLsTipoCondicion">Tipo de Condición</label>
                        <select id="reglaLsTipoCondicion" class="form-control">
                            <option value="EMAIL_OPENED" ${reglaParaEditar?.tipoCondicion === 'EMAIL_OPENED' ? 'selected' : ''}>Email Abierto</option>
                            <option value="PAGE_VISIT" ${reglaParaEditar?.tipoCondicion === 'PAGE_VISIT' ? 'selected' : ''}>Visita a Página</option>
                            <option value="FORM_SUBMITTED" ${reglaParaEditar?.tipoCondicion === 'FORM_SUBMITTED' ? 'selected' : ''}>Formulario Enviado</option>
                            <!-- Más opciones -->
                        </select>
                    </div>
                    <div id="detalles-condicion-ls-container">
                        <!-- Contenido dinámico según tipo de condición -->
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-guardar-regla-ls">Guardar Regla</button>
            </div>
        `;
        
        const tipoCondicionSelect = modal.querySelector('#reglaLsTipoCondicion');
        const detallesContainer = modal.querySelector('#detalles-condicion-ls-container');

        const renderizarDetallesCondicion = (tipo) => {
            let detallesHtml = '';
            switch (tipo) {
                case 'EMAIL_OPENED':
                    detallesHtml = `
                        <div class="form-group">
                            <label for="reglaLsCampaignId">ID de Campaña (opcional)</label>
                            <input type="text" id="reglaLsCampaignId" class="form-control" value="${reglaParaEditar?.campaignId || ''}" placeholder="Dejar vacío para cualquier campaña">
                        </div>`;
                    break;
                case 'PAGE_VISIT':
                    detallesHtml = `
                        <div class="form-group">
                            <label for="reglaLsUrlContains">URL Contiene</label>
                            <input type="text" id="reglaLsUrlContains" class="form-control" value="${reglaParaEditar?.urlContains || ''}" required placeholder="Ej: /precios">
                        </div>`;
                    break;
                case 'FORM_SUBMITTED':
                     detallesHtml = `
                        <div class="form-group">
                            <label for="reglaLsFormId">ID del Formulario (opcional)</label>
                            <input type="text" id="reglaLsFormId" class="form-control" value="${reglaParaEditar?.formId || ''}" placeholder="Dejar vacío para cualquier formulario">
                        </div>`;
                    break;
            }
            detallesContainer.innerHTML = detallesHtml;
        };

        tipoCondicionSelect.addEventListener('change', (e) => renderizarDetallesCondicion(e.target.value));
        renderizarDetallesCondicion(reglaParaEditar?.tipoCondicion || tipoCondicionSelect.value); // Renderizar inicial

        modalContainer.classList.add('active');

        // Eventos de cierre y guardado
        modal.querySelector('.btn-close').addEventListener('click', UTILS.hideModal);
        modal.querySelector('.btn-cancel').addEventListener('click', UTILS.hideModal);
        modal.querySelector('#btn-guardar-regla-ls').addEventListener('click', handleGuardarReglaLeadScoring);
    };

    /**
     * Maneja el clic en "Nueva Regla" para Lead Scoring.
     */
    const handleNuevaReglaLeadScoring = () => {
        mostrarEditorReglaLeadScoring(null);
    };

    /**
     * Maneja el clic en "Editar Regla" para Lead Scoring.
     * @param {string} reglaId - ID de la regla a editar.
     */
    const handleEditarReglaLeadScoring = (reglaId) => {
        const regla = config.datosGlobales.leadScoring?.reglas.find(r => r.id === reglaId);
        if (regla) {
            mostrarEditorReglaLeadScoring(regla);
        }
    };

    /**
     * Guarda una regla de Lead Scoring (nueva o editada).
     */
    const handleGuardarReglaLeadScoring = async () => {
        const form = document.getElementById('form-regla-ls');
        if (!UTILS.validateForm(form)) {
            UTILS.showToast('Por favor, complete todos los campos requeridos.', 'warning');
            return;
        }

        const reglaId = form.reglaLsId.value;
        const nuevaRegla = {
            id: reglaId,
            descripcion: form.reglaLsDescripcion.value,
            puntos: parseInt(form.reglaLsPuntos.value, 10),
            tipoCondicion: form.reglaLsTipoCondicion.value
        };

        // Añadir campos específicos de la condición
        switch (nuevaRegla.tipoCondicion) {
            case 'EMAIL_OPENED':
                nuevaRegla.campaignId = document.getElementById('reglaLsCampaignId')?.value || null;
                break;
            case 'PAGE_VISIT':
                nuevaRegla.urlContains = document.getElementById('reglaLsUrlContains')?.value;
                break;
            case 'FORM_SUBMITTED':
                nuevaRegla.formId = document.getElementById('reglaLsFormId')?.value || null;
                break;
        }

        if (!config.datosGlobales.leadScoring) {
            config.datosGlobales.leadScoring = { reglas: [] };
        }
        if (!config.datosGlobales.leadScoring.reglas) {
            config.datosGlobales.leadScoring.reglas = [];
        }

        const index = config.datosGlobales.leadScoring.reglas.findIndex(r => r.id === reglaId);
        if (index !== -1) {
            config.datosGlobales.leadScoring.reglas[index] = nuevaRegla;
        } else {
            config.datosGlobales.leadScoring.reglas.push(nuevaRegla);
        }

        try {
            await DB.updateItem('configuracionGlobal', config.datosGlobales);
            UTILS.showToast('Regla de Lead Scoring guardada.', 'success');
            UTILS.hideModal();
            renderLeadScoringSection(); // Re-renderizar la lista de reglas
        } catch (error) {
            console.error('Error al guardar regla de Lead Scoring:', error);
            UTILS.showToast('Error al guardar la regla.', 'error');
        }
    };

    /**
     * Elimina una regla de Lead Scoring.
     * @param {string} reglaId - ID de la regla a eliminar.
     */
    const handleEliminarReglaLeadScoring = async (reglaId) => {
        if (!confirm('¿Está seguro de eliminar esta regla de Lead Scoring?')) {
            return;
        }
        if (config.datosGlobales.leadScoring && config.datosGlobales.leadScoring.reglas) {
            config.datosGlobales.leadScoring.reglas = config.datosGlobales.leadScoring.reglas.filter(r => r.id !== reglaId);
            try {
                await DB.updateItem('configuracionGlobal', config.datosGlobales);
                UTILS.showToast('Regla eliminada.', 'success');
                renderLeadScoringSection();
            } catch (error) {
                console.error('Error al eliminar regla de Lead Scoring:', error);
                UTILS.showToast('Error al eliminar la regla.', 'error');
            }
        }
    };

    // --- FIN SECCIÓN DE LEAD SCORING ---

    // --- SECCIÓN DE AGENDAMIENTO ---

    /**
     * Renderiza la sección de configuración de Agendamiento.
     */
    const renderAgendamientoSection = () => {
        const agendamientoContainer = document.getElementById('agendamiento-settings');
        if (!agendamientoContainer) return;

        const agendamientoConfig = config.datosGlobales.agendamiento || { disponibilidad: [], duracionReunion: 30 };

        // UI básica para mostrar configuración actual y un botón para editar
        // La edición de disponibilidad podría ser compleja y abrir un modal o sub-vista
        let html = `
            <p>Configura tus horarios de disponibilidad y la duración de las reuniones.</p>
            <div class="form-group">
                <label for="duracionReunionPorDefecto">Duración por defecto de la reunión (minutos)</label>
                <input type="number" id="duracionReunionPorDefecto" class="form-control" style="max-width: 200px;" value="${agendamientoConfig.duracionReunion}" min="15">
            </div>
            
            <h4>Horarios de Disponibilidad Semanal</h4>
        `;

        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        // Asegurarnos de que `disponibilidad` sea un array
        const disponibilidadActual = Array.isArray(agendamientoConfig.disponibilidad) ? agendamientoConfig.disponibilidad : [];

        if (disponibilidadActual.length === 0) {
            // Si no hay disponibilidad, mostrar un estado inicial para cada día
            diasSemana.forEach((dia, index) => {
                disponibilidadActual.push({ diaIndice: index, diaNombre: dia, activo: false, rangos: [] });
            });
        }

        html += '<div class="list-group mt-3">';
        diasSemana.forEach((diaNombre, diaIndice) => {
            let diaConfig = disponibilidadActual.find(d => d.diaIndice === diaIndice);
            // Si por alguna razón no se encuentra (ej. datos antiguos), crear uno por defecto
            if (!diaConfig) {
                diaConfig = { diaIndice, diaNombre, activo: false, rangos: [] };
            }
            
            html += `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">
                            <input type="checkbox" id="diaActivo-${diaIndice}" class="form-check-input me-2" ${diaConfig.activo ? 'checked' : ''} data-dia-indice="${diaIndice}">
                            <label for="diaActivo-${diaIndice}" class="form-check-label">${diaNombre}</label>
                        </h5>
                        <button class="btn btn-sm btn-outline-primary btn-edit-disponibilidad-dia" data-dia-indice="${diaIndice}" ${!diaConfig.activo ? 'disabled' : ''}>
                            <i class="fas fa-clock"></i> Editar Horarios
                        </button>
                    </div>
                    <div class="rangos-display mt-2" id="rangos-dia-${diaIndice}">
                        ${diaConfig.activo ? renderRangosDia(diaConfig.rangos) : '<small class="text-muted">No disponible</small>'}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        html += `
            <div class="actions-footer mt-4">
                <button id="btn-guardar-config-agendamiento" class="btn btn-primary">
                    <i class="fas fa-save"></i> Guardar Configuración de Agendamiento
                </button>
            </div>
        `;

        agendamientoContainer.innerHTML = html;

        // Añadir listeners específicos para agendamiento aquí (ej. para btn-guardar-config-agendamiento)
    };

    /**
     * Renderiza los rangos de horario para un día específico.
     * @param {Array} rangos - Array de objetos { inicio: 'HH:mm', fin: 'HH:mm' }
     * @returns {string} HTML de los rangos.
     */
    const renderRangosDia = (rangos) => {
        if (!rangos || rangos.length === 0) {
            return '<small class="text-muted">Sin horarios definidos.</small>';
        }
        return rangos.map(r => `<span class="badge bg-success me-1">${r.inicio} - ${r.fin}</span>`).join('');
    };

    /**
     * Muestra el modal para editar los rangos de horario de un día.
     * @param {number} diaIndice - Índice del día (0 para Lunes, 6 para Domingo).
     */
    const mostrarEditorRangosDia = (diaIndice) => {
        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const diaNombre = diasSemana[diaIndice];
        const diaConfig = config.datosGlobales.agendamiento.disponibilidad.find(d => d.diaIndice === diaIndice) || { diaIndice, diaNombre, activo: true, rangos: [] };

        const modalContainer = document.getElementById('modal-container');
        const modal = modalContainer.querySelector('.modal');

        let rangosHtml = '';
        (diaConfig.rangos || []).forEach((rango, index) => {
            rangosHtml += `
                <div class="rango-item d-flex align-items-center mb-2" data-rango-index="${index}">
                    <input type="time" class="form-control form-control-sm me-2 rango-inicio" value="${rango.inicio}">
                    <span>-</span>
                    <input type="time" class="form-control form-control-sm ms-2 me-2 rango-fin" value="${rango.fin}">
                    <button type="button" class="btn btn-sm btn-danger btn-delete-rango"><i class="fas fa-times"></i></button>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="modal-header">
                <h3>Editar Horarios para ${diaNombre}</h3>
                <button class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
                <div id="rangos-editor-container">
                    ${rangosHtml || '<p class="text-muted">No hay rangos definidos.</p>'}
                </div>
                <button type="button" id="btn-add-rango" class="btn btn-sm btn-outline-success mt-2"><i class="fas fa-plus"></i> Añadir Rango</button>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btn-guardar-rangos-dia" data-dia-indice="${diaIndice}">Guardar Horarios</button>
            </div>
        `;

        modalContainer.classList.add('active');

        // Eventos del modal
        modal.querySelector('.btn-close').addEventListener('click', UTILS.hideModal);
        modal.querySelector('.btn-cancel').addEventListener('click', UTILS.hideModal);
        modal.querySelector('#btn-add-rango').addEventListener('click', () => handleAddRangoEditor(diaIndice));
        modal.querySelector('#btn-guardar-rangos-dia').addEventListener('click', () => handleGuardarRangosDia(diaIndice));
        
        modal.querySelectorAll('.btn-delete-rango').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.rango-item').remove();
                 if (modal.querySelectorAll('.rango-item').length === 0) {
                    modal.querySelector('#rangos-editor-container').innerHTML = '<p class="text-muted">No hay rangos definidos.</p>';
                }
            });
        });
    };

    /**
     * Añade un nuevo par de inputs de rango horario al editor de rangos del modal.
     */
    const handleAddRangoEditor = () => {
        const editorContainer = document.getElementById('rangos-editor-container');
        // Si está el mensaje de "No hay rangos", quitarlo
        const noRangosMsg = editorContainer.querySelector('.text-muted');
        if (noRangosMsg) noRangosMsg.remove();

        const newRangoIndex = editorContainer.querySelectorAll('.rango-item').length;
        const newRangoHtml = `
            <div class="rango-item d-flex align-items-center mb-2" data-rango-index="${newRangoIndex}">
                <input type="time" class="form-control form-control-sm me-2 rango-inicio" value="09:00">
                <span>-</span>
                <input type="time" class="form-control form-control-sm ms-2 me-2 rango-fin" value="17:00">
                <button type="button" class="btn btn-sm btn-danger btn-delete-rango"><i class="fas fa-times"></i></button>
            </div>
        `;
        editorContainer.insertAdjacentHTML('beforeend', newRangoHtml);
        // Añadir event listener al nuevo botón de eliminar
        const newDeleteButton = editorContainer.querySelector('.rango-item[data-rango-index="' + newRangoIndex + '"] .btn-delete-rango');
        newDeleteButton.addEventListener('click', (e) => {
             e.target.closest('.rango-item').remove();
             if (editorContainer.querySelectorAll('.rango-item').length === 0) {
                editorContainer.innerHTML = '<p class="text-muted">No hay rangos definidos.</p>';
            }
        });
    };
    
    /**
     * Guarda los rangos de horario editados para un día específico.
     * @param {number} diaIndice - Índice del día.
     */
    const handleGuardarRangosDia = (diaIndice) => {
        const rangosNuevos = [];
        document.querySelectorAll('#rangos-editor-container .rango-item').forEach(item => {
            const inicio = item.querySelector('.rango-inicio').value;
            const fin = item.querySelector('.rango-fin').value;
            if (inicio && fin && inicio < fin) {
                rangosNuevos.push({ inicio, fin });
            } else if (inicio && fin) {
                UTILS.showToast('La hora de fin debe ser posterior a la hora de inicio.', 'warning');
            }
        });

        const diaConfigIndex = config.datosGlobales.agendamiento.disponibilidad.findIndex(d => d.diaIndice === diaIndice);
        if (diaConfigIndex !== -1) {
            config.datosGlobales.agendamiento.disponibilidad[diaConfigIndex].rangos = rangosNuevos;
        } else {
             // Esto no debería pasar si la UI se genera correctamente
            const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            config.datosGlobales.agendamiento.disponibilidad.push({
                diaIndice: diaIndice,
                diaNombre: diasSemana[diaIndice],
                activo: true, // Asumimos que si se editan rangos, el día está activo
                rangos: rangosNuevos
            });
        }
        UTILS.hideModal();
        renderAgendamientoSection(); // Re-renderizar para mostrar cambios
        // El guardado final se hace con el botón principal de la sección de agendamiento
        UTILS.showToast('Horarios del día actualizados. Recuerda guardar la configuración general de agendamiento.', 'info');
    };

    /**
     * Guarda toda la configuración de Agendamiento.
     */
    const handleGuardarConfigAgendamiento = async () => {
        const duracionReunionInput = document.getElementById('duracionReunionPorDefecto');
        const duracionReunion = parseInt(duracionReunionInput.value, 10);

        if (isNaN(duracionReunion) || duracionReunion < 15) {
            UTILS.showToast('La duración de la reunión debe ser al menos 15 minutos.', 'warning');
            duracionReunionInput.focus();
            return;
        }
        config.datosGlobales.agendamiento.duracionReunion = duracionReunion;
        
        // La disponibilidad por día (activo y rangos) ya debería estar actualizada en config.datosGlobales.agendamiento.disponibilidad
        // a través de handleGuardarRangosDia y los checkboxes de activación de día.

        try {
            await DB.updateItem('configuracionGlobal', config.datosGlobales);
            UTILS.showToast('Configuración de Agendamiento guardada.', 'success');
            renderAgendamientoSection(); // Re-renderizar por si acaso
        } catch (error) {
            console.error('Error al guardar configuración de Agendamiento:', error);
            UTILS.showToast('Error al guardar la configuración de Agendamiento.', 'error');
        }
    };

    // --- FIN SECCIÓN DE AGENDAMIENTO ---

    // Actualizar setupEventListeners para incluir los de agendamiento
    const originalSetupEventListeners = setupEventListeners;
    const setupEventListenersExtended = () => {
        originalSetupEventListeners(); // Llama a los listeners originales
        const container = document.querySelector(config.containerSelector);
        if (!container) return;

        container.addEventListener('click', async (event) => {
            if (event.target.id === 'btn-guardar-config-agendamiento') {
                await handleGuardarConfigAgendamiento();
            }
            if (event.target.closest('.btn-edit-disponibilidad-dia')) {
                const diaIndice = parseInt(event.target.closest('.btn-edit-disponibilidad-dia').getAttribute('data-dia-indice'), 10);
                mostrarEditorRangosDia(diaIndice);
            }
        });

        container.addEventListener('change', (event) => {
            if (event.target.matches('input[id^="diaActivo-"]')) {
                const checkbox = event.target;
                const diaIndice = parseInt(checkbox.getAttribute('data-dia-indice'), 10);
                const btnEditar = container.querySelector('.btn-edit-disponibilidad-dia[data-dia-indice="' + diaIndice + '"]');
                const rangosDisplay = container.querySelector('#rangos-dia-' + diaIndice);
                
                const diaConfig = config.datosGlobales.agendamiento.disponibilidad.find(d => d.diaIndice === diaIndice);
                if(diaConfig){
                    diaConfig.activo = checkbox.checked;
                    if (btnEditar) btnEditar.disabled = !checkbox.checked;
                    if (rangosDisplay) {
                        rangosDisplay.innerHTML = checkbox.checked ? renderRangosDia(diaConfig.rangos) : '<small class="text-muted">No disponible</small>';
                    }
                }
                // Nota: Esto solo actualiza la UI y el estado en `config.datosGlobales`.
                // El guardado final a DB se hace con el botón "Guardar Configuración de Agendamiento".
            }
        });
    };
    // Reemplazar la función original con la extendida
    // Esto es un poco hacky, una mejor solución sería un sistema de eventos más robusto o separar los listeners.
    // Por simplicidad, lo hacemos así por ahora.
    const _setupEventListeners = setupEventListenersExtended;

    // Exponer funciones públicas
    return {
        init: async () => {
            console.log('Inicializando módulo de Configuración Global (extendido)');
            if (!document.querySelector(config.containerSelector)) {
                console.warn('Contenedor de configuración global no encontrado en el DOM. Saltando inicialización.');
                return;
            }
            await loadGlobalSettings();
            renderConfiguracionPage();
            _setupEventListeners(); // Usar la versión extendida
        }
    };
})(); 