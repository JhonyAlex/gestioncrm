/**
 * Módulo de enrutamiento simple para la Consola de Parametrización CRM
 * Gestiona la navegación entre secciones de la aplicación sin recargar la página
 */

const ROUTER = (() => {
    // Configuración de rutas disponibles y sus controladores
    const routes = {
        'embudos': {
            init: () => {
                FUNNEL_BUILDER.init();
            },
            params: {}
        },
        'automatizaciones': {
            init: (params = {}) => {
                AUTOMATION_EDITOR.init(params);
            },
            params: {}
        },
        'ia': {
            init: () => {
                AI_CONFIGURATOR.init();
            },
            params: {}
        },
        'configuracion': {
            init: () => {
                GLOBAL_SETTINGS.init();
            },
            params: {}
        }
    };

    // Ruta actual
    let currentRoute = 'embudos';

    /**
     * Inicializa el enrutador
     */
    const init = () => {
        // Obtener la ruta inicial de la URL (hash) si existe
        const hash = window.location.hash.substring(1);
        if (hash && routes[hash]) {
            currentRoute = hash;
        }

        // Configurar listener para cambios en el hash
        window.addEventListener('hashchange', handleHashChange);

        // Configurar listener para los elementos de navegación
        setupNavigationListeners();

        // Navegar a la ruta inicial
        navigateTo(currentRoute);
    };

    /**
     * Maneja los cambios en el hash de la URL
     */
    const handleHashChange = () => {
        const hash = window.location.hash.substring(1);
        if (hash && routes[hash]) {
            navigateTo(hash);
        }
    };

    /**
     * Configura los listeners para los elementos de navegación
     */
    const setupNavigationListeners = () => {
        document.querySelectorAll('#main-nav .nav-item').forEach(navItem => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                const route = navItem.getAttribute('data-section');
                if (route && routes[route]) {
                    navigateTo(route);
                }
            });
        });
    };

    /**
     * Navega a una ruta específica
     * @param {string} route - Ruta a la que navegar
     * @param {Object} params - Parámetros para la ruta (opcional)
     */
    const navigateTo = (route, params = {}) => {
        if (!routes[route]) {
            console.error(`La ruta '${route}' no está definida`);
            return;
        }

        // Ocultar todas las secciones
        document.querySelectorAll('.section-container').forEach(section => {
            section.classList.remove('active');
        });

        // Mostrar la sección correspondiente
        const sectionElement = document.getElementById(`${route}-section`);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }

        // Actualizar elementos de navegación activos
        document.querySelectorAll('#main-nav .nav-item').forEach(navItem => {
            navItem.classList.remove('active');
            if (navItem.getAttribute('data-section') === route) {
                navItem.classList.add('active');
            }
        });

        // Guardar parámetros de la ruta
        routes[route].params = params;

        // Inicializar el controlador de la ruta
        routes[route].init(params);

        // Actualizar la ruta actual
        currentRoute = route;

        // Actualizar el hash de la URL sin provocar un evento hashchange
        const newUrl = `#${route}`;
        if (window.location.hash !== newUrl) {
            history.pushState(null, '', newUrl);
        }
    };

    /**
     * Obtiene la ruta actual
     * @returns {string} Ruta actual
     */
    const getCurrentRoute = () => {
        return currentRoute;
    };

    /**
     * Obtiene los parámetros de la ruta actual
     * @returns {Object} Parámetros de la ruta actual
     */
    const getCurrentParams = () => {
        return routes[currentRoute].params;
    };

    /**
     * Actualiza los parámetros de la ruta actual
     * @param {Object} newParams - Nuevos parámetros a añadir/actualizar
     */
    const updateParams = (newParams) => {
        routes[currentRoute].params = {
            ...routes[currentRoute].params,
            ...newParams
        };
    };

    return {
        init,
        navigateTo,
        getCurrentRoute,
        getCurrentParams,
        updateParams
    };
})(); 