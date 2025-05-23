/**
 * Módulo de construcción y gestión de Embudos de Venta
 * Permite crear, editar, visualizar y eliminar embudos y sus etapas
 */

const FUNNEL_BUILDER = (() => {
    // Configuración y variables internas
    const config = {
        currentEmbudoId: null,
        containerSelector: '#embudos-list',
        emptyStateSelector: '#embudos-empty',
        embudoTemplate: null
    };

    /**
     * Inicializa el módulo
     */
    const init = async () => {
        console.log('Inicializando módulo de Embudos de Venta');
        
        // Configurar los listeners de eventos
        setupEventListeners();
        
        // Cargar y renderizar los embudos existentes
        await loadEmbudos();
    };

    /**
     * Configura los listeners de eventos
     */
    const setupEventListeners = () => {
        // Botón para crear nuevo embudo
        document.getElementById('btnNuevoEmbudo').addEventListener('click', handleNuevoEmbudoClick);
        
        // Configurar el listener para guardar embudo desde el modal
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'btn-guardar-embudo') {
                handleGuardarEmbudo();
            }
        });
    };

    /**
     * Carga los embudos desde la BD y los renderiza
     */
    const loadEmbudos = async () => {
        try {
            const embudos = await DB.getEmbudosConEtapas();
            renderEmbudosList(embudos);
        } catch (error) {
            console.error('Error al cargar los embudos:', error);
            UTILS.showToast('Error al cargar los embudos', 'error');
        }
    };

    /**
     * Renderiza la lista de embudos
     * @param {Array} embudos - Lista de embudos a renderizar
     */
    const renderEmbudosList = (embudos) => {
        const container = document.querySelector(config.containerSelector);
        const emptyState = document.querySelector(config.emptyStateSelector);
        
        // Limpiar el contenedor
        container.innerHTML = '';
        
        // Mostrar estado vacío si no hay embudos
        if (!embudos || embudos.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        // Ocultar estado vacío y mostrar embudos
        emptyState.style.display = 'none';
        
        // Renderizar cada embudo
        embudos.forEach(embudo => {
            const embudoElement = createEmbudoElement(embudo);
            container.appendChild(embudoElement);
        });
    };

    /**
     * Crea un elemento DOM para un embudo
     * @param {Object} embudo - Datos del embudo
     * @returns {HTMLElement} Elemento DOM del embudo
     */
    const createEmbudoElement = (embudo) => {
        const embudoCard = document.createElement('div');
        embudoCard.className = 'card embudo-card';
        embudoCard.dataset.id = embudo.id;
        
        // Formatear fecha
        const fechaCreacion = UTILS.formatDate(embudo.fechaCreacion);
        const etapasCount = embudo.etapas ? embudo.etapas.length : 0;
        
        embudoCard.innerHTML = `
            <div class="card-header">
                <h3>${UTILS.escapeHTML(embudo.nombre)}</h3>
                <span class="badge">${etapasCount} etapa${etapasCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="card-body">
                <p>${UTILS.escapeHTML(embudo.descripcion || 'Sin descripción')}</p>
                <small>Creado el: ${fechaCreacion}</small>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-outline btn-editar-embudo" data-id="${embudo.id}">
                    <i class="fas fa-pen"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline btn-etapas-embudo" data-id="${embudo.id}">
                    <i class="fas fa-sitemap"></i> Etapas
                </button>
                <button class="btn btn-sm btn-outline btn-danger btn-eliminar-embudo" data-id="${embudo.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Agregar event listeners
        const btnEditar = embudoCard.querySelector('.btn-editar-embudo');
        btnEditar.addEventListener('click', () => handleEditarEmbudo(embudo.id));
        
        const btnEtapas = embudoCard.querySelector('.btn-etapas-embudo');
        btnEtapas.addEventListener('click', () => handleGestionarEtapas(embudo.id));
        
        const btnEliminar = embudoCard.querySelector('.btn-eliminar-embudo');
        btnEliminar.addEventListener('click', () => handleEliminarEmbudo(embudo.id));
        
        return embudoCard;
    };

    /**
     * Maneja el clic en el botón de nuevo embudo
     */
    const handleNuevoEmbudoClick = () => {
        // Limpiar ID actual
        config.currentEmbudoId = null;
        
        // Mostrar modal de creación
        UTILS.showModal('modal-embudo');
        
        // Resetear el formulario
        const form = document.getElementById('form-embudo');
        if (form) {
            form.reset();
        }
        
        // Actualizar título del modal
        const modalTitle = document.querySelector('#modal-embudo .modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = 'Nuevo Embudo';
        }
    };

    /**
     * Maneja el clic en el botón de editar embudo
     * @param {string} embudoId - ID del embudo a editar
     */
    const handleEditarEmbudo = async (embudoId) => {
        try {
            // Obtener datos del embudo
            const embudo = await DB.getItem('embudos', embudoId);
            if (!embudo) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Guardar el ID del embudo actual
            config.currentEmbudoId = embudoId;
            
            // Mostrar modal
            UTILS.showModal('modal-embudo');
            
            // Actualizar título del modal
            const modalTitle = document.querySelector('#modal-embudo .modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = 'Editar Embudo';
            }
            
            // Rellenar el formulario
            const form = document.getElementById('form-embudo');
            if (form) {
                form.nombre.value = embudo.nombre || '';
                form.descripcion.value = embudo.descripcion || '';
                form.embudoId.value = embudoId;
            }
        } catch (error) {
            console.error('Error al cargar el embudo para editar:', error);
            UTILS.showToast('Error al cargar los datos del embudo', 'error');
        }
    };

    /**
     * Maneja el clic en el botón de gestionar etapas de un embudo
     * @param {string} embudoId - ID del embudo a gestionar sus etapas
     */
    const handleGestionarEtapas = async (embudoId) => {
        try {
            // Obtener datos del embudo
            const embudo = await DB.getItem('embudos', embudoId);
            if (!embudo) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Navegar a la vista de etapas con el ID del embudo como parámetro
            ROUTER.navigateTo('embudos', { view: 'detalle', embudoId });
            
            // Renderizar la vista de etapas
            renderEmbudoDetalle(embudo);
        } catch (error) {
            console.error('Error al cargar las etapas del embudo:', error);
            UTILS.showToast('Error al cargar las etapas', 'error');
        }
    };

    /**
     * Maneja el clic en el botón de eliminar embudo
     * @param {string} embudoId - ID del embudo a eliminar
     */
    const handleEliminarEmbudo = async (embudoId) => {
        if (confirm('¿Estás seguro de que deseas eliminar este embudo? Esta acción no se puede deshacer.')) {
            try {
                await DB.deleteItem('embudos', embudoId);
                UTILS.showToast('Embudo eliminado correctamente', 'success');
                
                // Recargar la lista
                await loadEmbudos();
            } catch (error) {
                console.error('Error al eliminar el embudo:', error);
                UTILS.showToast('Error al eliminar el embudo', 'error');
            }
        }
    };

    /**
     * Maneja el envío del formulario de embudo
     */
    const handleGuardarEmbudo = async () => {
        const form = document.getElementById('form-embudo');
        
        // Validar el formulario
        if (!UTILS.validateForm(form)) {
            return;
        }
        
        // Obtener datos del formulario
        const formData = UTILS.getFormData(form);
        
        try {
            let embudo;
            let isNew = false;
            
            if (config.currentEmbudoId) {
                // Actualizar embudo existente
                embudo = await DB.getItem('embudos', config.currentEmbudoId);
                embudo.nombre = formData.nombre;
                embudo.descripcion = formData.descripcion;
                await DB.updateItem('embudos', embudo);
                UTILS.showToast('Embudo actualizado correctamente', 'success');
            } else {
                // Crear nuevo embudo
                embudo = {
                    id: UTILS.generateUUID(),
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    etapas: [],
                    fechaCreacion: Date.now()
                };
                await DB.addItem('embudos', embudo);
                UTILS.showToast('Embudo creado correctamente', 'success');
                isNew = true;
            }
            
            // Cerrar modal
            UTILS.hideModal();
            
            // Recargar la lista
            await loadEmbudos();
            
            // Si es nuevo, ir directamente a gestión de etapas
            if (isNew) {
                handleGestionarEtapas(embudo.id);
            }
        } catch (error) {
            console.error('Error al guardar el embudo:', error);
            UTILS.showToast('Error al guardar el embudo', 'error');
        }
    };

    /**
     * Renderiza el detalle de un embudo con sus etapas
     * @param {Object} embudo - Datos del embudo a renderizar
     */
    const renderEmbudoDetalle = (embudo) => {
        // Actualizar el contenedor principal
        const container = document.querySelector(config.containerSelector);
        
        // Construir el HTML del detalle
        const html = `
            <div class="embudo-detalle">
                <div class="embudo-header">
                    <h3>${UTILS.escapeHTML(embudo.nombre)}</h3>
                    <p>${UTILS.escapeHTML(embudo.descripcion || 'Sin descripción')}</p>
                    <div class="embudo-actions">
                        <button class="btn btn-sm btn-outline" id="btn-volver-embudos">
                            <i class="fas fa-arrow-left"></i> Volver a Embudos
                        </button>
                        <button class="btn btn-sm btn-primary" id="btn-nueva-etapa" data-embudo-id="${embudo.id}">
                            <i class="fas fa-plus"></i> Nueva Etapa
                        </button>
                    </div>
                </div>
                <div class="etapa-container" id="etapas-container">
                    ${renderEtapas(embudo)}
                </div>
            </div>
        `;
        
        // Actualizar el contenedor
        container.innerHTML = html;
        
        // Configurar eventos para los botones
        document.getElementById('btn-volver-embudos').addEventListener('click', () => {
            ROUTER.navigateTo('embudos');
        });
        
        document.getElementById('btn-nueva-etapa').addEventListener('click', () => {
            handleNuevaEtapa(embudo.id);
        });
        
        // Configurar eventos para los botones de las etapas
        setupEtapasEventListeners(embudo.id);
        
        // Configurar drag & drop para las etapas si hay alguna
        if (embudo.etapas && embudo.etapas.length > 0) {
            setupDragAndDrop();
        }
    };

    /**
     * Renderiza las etapas de un embudo
     * @param {Object} embudo - Embudo con sus etapas
     * @returns {string} HTML con las etapas renderizadas
     */
    const renderEtapas = (embudo) => {
        if (!embudo.etapas || embudo.etapas.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-sitemap empty-icon"></i>
                    <h3>No hay etapas configuradas</h3>
                    <p>Crea la primera etapa para comenzar a configurar el flujo de ventas.</p>
                </div>
            `;
        }
        
        // Ordenar etapas por su orden
        const etapasOrdenadas = [...embudo.etapas].sort((a, b) => a.orden - b.orden);
        
        // Generar HTML para cada etapa
        return etapasOrdenadas.map(etapa => `
            <div class="etapa-column draggable" data-etapa-id="${etapa.id}" draggable="true">
                <div class="etapa-header">
                    <h4 class="etapa-title">${UTILS.escapeHTML(etapa.nombre)}</h4>
                    <div class="etapa-actions">
                        <button class="btn btn-icon btn-edit-etapa" data-etapa-id="${etapa.id}" title="Editar etapa">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-icon btn-automatizacion" data-etapa-id="${etapa.id}" title="Configurar automatización">
                            <i class="fas fa-robot"></i>
                        </button>
                        <button class="btn btn-icon btn-delete-etapa" data-etapa-id="${etapa.id}" title="Eliminar etapa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="etapa-body">
                    <div class="automatizacion-status">
                        ${etapa.automatizaciones && etapa.automatizaciones.length > 0 
                            ? `<span class="badge badge-success"><i class="fas fa-check-circle"></i> ${etapa.automatizaciones.length} automatización(es)</span>` 
                            : '<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Sin automatizaciones</span>'}
                    </div>
                </div>
            </div>
        `).join('');
    };

    /**
     * Configura los event listeners para los botones de las etapas
     * @param {string} embudoId - ID del embudo
     */
    const setupEtapasEventListeners = (embudoId) => {
        // Botones de editar etapa
        document.querySelectorAll('.btn-edit-etapa').forEach(btn => {
            btn.addEventListener('click', () => {
                const etapaId = btn.getAttribute('data-etapa-id');
                handleEditarEtapa(embudoId, etapaId);
            });
        });
        
        // Botones de configurar automatización
        document.querySelectorAll('.btn-automatizacion').forEach(btn => {
            btn.addEventListener('click', () => {
                const etapaId = btn.getAttribute('data-etapa-id');
                handleConfigurarAutomatizacion(embudoId, etapaId);
            });
        });
        
        // Botones de eliminar etapa
        document.querySelectorAll('.btn-delete-etapa').forEach(btn => {
            btn.addEventListener('click', () => {
                const etapaId = btn.getAttribute('data-etapa-id');
                handleEliminarEtapa(embudoId, etapaId);
            });
        });
    };

    /**
     * Configura el sistema de drag & drop para reordenar etapas
     */
    const setupDragAndDrop = () => {
        const etapas = document.querySelectorAll('.etapa-column');
        const container = document.getElementById('etapas-container');
        
        etapas.forEach(etapa => {
            etapa.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', etapa.getAttribute('data-etapa-id'));
                etapa.classList.add('dragging');
            });
            
            etapa.addEventListener('dragend', () => {
                etapa.classList.remove('dragging');
            });
        });
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientX);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        });
        
        container.addEventListener('drop', handleEtapasReordered);
    };

    /**
     * Determina después de qué elemento insertar el elemento arrastrado
     * @param {HTMLElement} container - Contenedor de las etapas
     * @param {number} x - Posición X del cursor
     * @returns {HTMLElement|null} Elemento después del cual insertar
     */
    const getDragAfterElement = (container, x) => {
        const draggableElements = [...container.querySelectorAll('.etapa-column:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    /**
     * Maneja el reordenamiento de etapas después del drag & drop
     * @param {Event} e - Evento de drop
     */
    const handleEtapasReordered = async (e) => {
        e.preventDefault();
        
        try {
            // Obtener el ID del embudo actual
            const params = ROUTER.getCurrentParams();
            const embudoId = params.embudoId;
            
            if (!embudoId) {
                return;
            }
            
            const embudo = await DB.getItem('embudos', embudoId);
            if (!embudo) {
                return;
            }
            
            // Obtener el nuevo orden de las etapas
            const etapasElements = document.querySelectorAll('.etapa-column');
            const nuevoOrden = Array.from(etapasElements).map(el => el.getAttribute('data-etapa-id'));
            
            // Actualizar el orden en el objeto de embudo
            embudo.etapas = embudo.etapas.map((etapa, i) => {
                const newIndex = nuevoOrden.indexOf(etapa.id);
                return {
                    ...etapa,
                    orden: newIndex >= 0 ? newIndex : i
                };
            }).sort((a, b) => a.orden - b.orden);
            
            // Guardar el embudo actualizado
            await DB.updateItem('embudos', embudo);
        } catch (error) {
            console.error('Error al reordenar las etapas:', error);
            UTILS.showToast('Error al actualizar el orden de las etapas', 'error');
        }
    };

    /**
     * Maneja el clic en el botón de nueva etapa
     * @param {string} embudoId - ID del embudo
     */
    const handleNuevaEtapa = (embudoId) => {
        // Mostrar modal de etapa
        UTILS.showModal('modal-etapa');
        
        // Resetear formulario
        const form = document.getElementById('form-etapa');
        if (form) {
            form.reset();
            form.embudoId.value = embudoId;
        }
        
        // Actualizar título
        const modalTitle = document.querySelector('#modal-etapa .modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = 'Nueva Etapa';
        }
        
        // Configurar el botón de guardar
        const btnGuardar = document.getElementById('btn-guardar-etapa');
        if (btnGuardar) {
            btnGuardar.onclick = handleGuardarEtapa;
        }
    };

    /**
     * Maneja el clic en el botón de editar etapa
     * @param {string} embudoId - ID del embudo
     * @param {string} etapaId - ID de la etapa
     */
    const handleEditarEtapa = async (embudoId, etapaId) => {
        try {
            // Obtener el embudo
            const embudo = await DB.getItem('embudos', embudoId);
            if (!embudo) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Buscar la etapa
            const etapa = embudo.etapas.find(e => e.id === etapaId);
            if (!etapa) {
                UTILS.showToast('Etapa no encontrada', 'error');
                return;
            }
            
            // Mostrar modal
            UTILS.showModal('modal-etapa');
            
            // Rellenar formulario
            const form = document.getElementById('form-etapa');
            if (form) {
                form.nombreEtapa.value = etapa.nombre || '';
                form.etapaId.value = etapaId;
                form.embudoId.value = embudoId;
            }
            
            // Actualizar título
            const modalTitle = document.querySelector('#modal-etapa .modal-header h3');
            if (modalTitle) {
                modalTitle.textContent = 'Editar Etapa';
            }
            
            // Configurar el botón de guardar
            const btnGuardar = document.getElementById('btn-guardar-etapa');
            if (btnGuardar) {
                btnGuardar.onclick = handleGuardarEtapa;
            }
        } catch (error) {
            console.error('Error al cargar la etapa para editar:', error);
            UTILS.showToast('Error al cargar los datos de la etapa', 'error');
        }
    };

    /**
     * Maneja el guardado de una etapa (nueva o existente)
     */
    const handleGuardarEtapa = async () => {
        const form = document.getElementById('form-etapa');
        
        // Validar formulario
        if (!UTILS.validateForm(form)) {
            return;
        }
        
        // Obtener datos
        const formData = UTILS.getFormData(form);
        const embudoId = formData.embudoId;
        const etapaId = formData.etapaId;
        
        try {
            // Obtener el embudo
            const embudo = await DB.getItem('embudos', embudoId);
            if (!embudo) {
                UTILS.showToast('Embudo no encontrado', 'error');
                return;
            }
            
            // Inicializar etapas si no existen
            if (!embudo.etapas) {
                embudo.etapas = [];
            }
            
            if (etapaId) {
                // Actualizar etapa existente
                const index = embudo.etapas.findIndex(e => e.id === etapaId);
                if (index >= 0) {
                    embudo.etapas[index].nombre = formData.nombreEtapa;
                }
            } else {
                // Crear nueva etapa
                const nuevaEtapa = {
                    id: UTILS.generateUUID(),
                    nombre: formData.nombreEtapa,
                    orden: embudo.etapas.length,
                    automatizaciones: []
                };
                
                embudo.etapas.push(nuevaEtapa);
            }
            
            // Actualizar embudo
            await DB.updateItem('embudos', embudo);
            
            // Cerrar modal
            UTILS.hideModal();
            
            // Mostrar mensaje
            UTILS.showToast(etapaId ? 'Etapa actualizada correctamente' : 'Etapa creada correctamente', 'success');
            
            // Recargar vista
            renderEmbudoDetalle(embudo);
        } catch (error) {
            console.error('Error al guardar la etapa:', error);
            UTILS.showToast('Error al guardar la etapa', 'error');
        }
    };

    /**
     * Maneja la eliminación de una etapa
     * @param {string} embudoId - ID del embudo
     * @param {string} etapaId - ID de la etapa a eliminar
     */
    const handleEliminarEtapa = async (embudoId, etapaId) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta etapa? También se eliminarán todas sus automatizaciones.')) {
            try {
                // Obtener el embudo
                const embudo = await DB.getItem('embudos', embudoId);
                if (!embudo) {
                    UTILS.showToast('Embudo no encontrado', 'error');
                    return;
                }
                
                // Filtrar la etapa a eliminar
                embudo.etapas = embudo.etapas.filter(e => e.id !== etapaId);
                
                // Reordenar las etapas restantes
                embudo.etapas = embudo.etapas.map((etapa, index) => {
                    return { ...etapa, orden: index };
                });
                
                // Actualizar embudo
                await DB.updateItem('embudos', embudo);
                
                // Mostrar mensaje
                UTILS.showToast('Etapa eliminada correctamente', 'success');
                
                // Recargar vista
                renderEmbudoDetalle(embudo);
            } catch (error) {
                console.error('Error al eliminar la etapa:', error);
                UTILS.showToast('Error al eliminar la etapa', 'error');
            }
        }
    };

    /**
     * Maneja la configuración de automatizaciones para una etapa
     * @param {string} embudoId - ID del embudo
     * @param {string} etapaId - ID de la etapa
     */
    const handleConfigurarAutomatizacion = (embudoId, etapaId) => {
        // Navegar a la sección de automatizaciones con los parámetros necesarios
        ROUTER.navigateTo('automatizaciones', { embudoId, etapaId });
    };

    return {
        init,
        loadEmbudos,
        renderEmbudoDetalle
    };
})(); 