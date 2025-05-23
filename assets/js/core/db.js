/**
 * Módulo de gestión de datos con IndexedDB para la Consola de Parametrización CRM
 * Proporciona una API simplificada para interactuar con la base de datos local
 */

const DB = (() => {
    // Configuración general de la base de datos
    const CONFIG = {
        name: 'CRMParaKonfigDB',
        version: 1,
        stores: {
            embudos: { keyPath: 'id', indices: [] },
            plantillasMensajes: { keyPath: 'id', indices: ['tipo'] },
            configuracionesIA: { keyPath: 'id', indices: [] },
            configuracionGlobal: { keyPath: 'id', indices: [] }
        }
    };

    // Variable para almacenar la conexión a la base de datos
    let dbConnection = null;

    /**
     * Inicializa la conexión a la base de datos
     * @returns {Promise} Promesa que se resuelve cuando la BD está lista
     */
    const initDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.name, CONFIG.version);

            // Se ejecuta si es necesario crear o actualizar la estructura de la BD
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear los object stores definidos en la configuración
                Object.keys(CONFIG.stores).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const storeConfig = CONFIG.stores[storeName];
                        const store = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
                        
                        // Crear índices si existen
                        if (storeConfig.indices) {
                            storeConfig.indices.forEach(indexName => {
                                store.createIndex(indexName, indexName, { unique: false });
                            });
                        }
                        
                        console.log(`Object store '${storeName}' creado correctamente`);
                    }
                });
            };

            // Manejo de eventos de conexión exitosa y fallida
            request.onsuccess = (event) => {
                dbConnection = event.target.result;
                console.log('Conexión a la base de datos establecida correctamente');
                resolve(dbConnection);
            };

            request.onerror = (event) => {
                console.error('Error al abrir la base de datos:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Ejecuta una transacción en un object store específico
     * @param {string} storeName - Nombre del object store
     * @param {string} mode - Modo de la transacción ('readonly', 'readwrite')
     * @param {Function} callback - Función a ejecutar con el object store
     * @returns {Promise} - Promesa que se resuelve con el resultado del callback
     */
    const transaction = (storeName, mode, callback) => {
        return new Promise((resolve, reject) => {
            if (!dbConnection) {
                reject(new Error('La base de datos no está conectada. Llama a initDB primero.'));
                return;
            }

            try {
                const tx = dbConnection.transaction(storeName, mode);
                const store = tx.objectStore(storeName);
                
                tx.oncomplete = () => resolve();
                tx.onerror = (event) => reject(event.target.error);
                
                // Ejecuta el callback y maneja la resolución de su resultado si es una promesa
                const result = callback(store, tx);
                if (result instanceof Promise) {
                    result.then(resolve).catch(reject);
                } else if (result !== undefined) {
                    resolve(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    };

    /**
     * Agrega un nuevo ítem a un object store
     * @param {string} storeName - Nombre del object store
     * @param {Object} item - Ítem a agregar (debe tener el keyPath si no es autoincremental)
     * @returns {Promise<any>} - Promesa que se resuelve con la clave del ítem agregado
     */
    const addItem = (storeName, item) => {
        // Aseguramos que el item tenga un ID y timestamps
        if (!item.id) {
            item.id = UTILS.generateUUID();
        }
        
        if (!item.fechaCreacion) {
            item.fechaCreacion = Date.now();
        }
        
        if (!item.fechaModificacion) {
            item.fechaModificacion = Date.now();
        }

        return transaction(storeName, 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add(item);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    };

    /**
     * Obtiene un ítem por su clave
     * @param {string} storeName - Nombre del object store
     * @param {string|number} key - Clave del ítem
     * @returns {Promise<Object>} - Promesa que se resuelve con el ítem o null si no existe
     */
    const getItem = (storeName, key) => {
        return transaction(storeName, 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = (event) => resolve(event.target.result || null);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    };

    /**
     * Obtiene todos los ítems de un object store
     * @param {string} storeName - Nombre del object store
     * @returns {Promise<Array>} - Promesa que se resuelve con un array de ítems
     */
    const getAllItems = (storeName) => {
        return transaction(storeName, 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = (event) => resolve(event.target.result || []);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    };

    /**
     * Actualiza un ítem existente
     * @param {string} storeName - Nombre del object store
     * @param {Object} item - Ítem a actualizar (debe tener el keyPath)
     * @returns {Promise<any>} - Promesa que se resuelve cuando el ítem es actualizado
     */
    const updateItem = (storeName, item) => {
        // Actualizar timestamp de modificación
        item.fechaModificacion = Date.now();

        return transaction(storeName, 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.put(item);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    };

    /**
     * Elimina un ítem por su clave
     * @param {string} storeName - Nombre del object store
     * @param {string|number} key - Clave del ítem a eliminar
     * @returns {Promise<void>} - Promesa que se resuelve cuando el ítem es eliminado
     */
    const deleteItem = (storeName, key) => {
        return transaction(storeName, 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        });
    };

    /**
     * Elimina todos los ítems de un object store
     * @param {string} storeName - Nombre del object store a limpiar
     * @returns {Promise<void>} - Promesa que se resuelve cuando el store es limpiado
     */
    const clearStore = (storeName) => {
        return transaction(storeName, 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        });
    };

    /**
     * Obtiene todos los embudos con sus etapas
     * @returns {Promise<Array>} - Promesa que se resuelve con los embudos y sus etapas
     */
    const getEmbudosConEtapas = () => {
        return getAllItems('embudos');
    };

    /**
     * Obtiene las plantillas de mensajes de un tipo específico
     * @param {string} tipo - Tipo de plantilla (email, whatsapp, sms, etc.)
     * @returns {Promise<Array>} - Promesa que se resuelve con las plantillas del tipo especificado
     */
    const getPlantillasPorTipo = (tipo) => {
        return transaction('plantillasMensajes', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                // Si existe un índice para el tipo, lo usamos
                if (store.indexNames.contains('tipo')) {
                    const index = store.index('tipo');
                    const request = index.getAll(tipo);
                    request.onsuccess = (event) => resolve(event.target.result || []);
                    request.onerror = (event) => reject(event.target.error);
                } else {
                    // Si no hay índice, obtenemos todos y filtramos
                    const request = store.getAll();
                    request.onsuccess = (event) => {
                        const plantillas = event.target.result || [];
                        const filtradas = plantillas.filter(p => p.tipo === tipo);
                        resolve(filtradas);
                    };
                    request.onerror = (event) => reject(event.target.error);
                }
            });
        });
    };

    /**
     * Exporta toda la configuración como un objeto JSON
     * @returns {Promise<Object>} - Promesa que se resuelve con el objeto de configuración completo
     */
    const exportarConfiguracion = async () => {
        try {
            // Obtenemos todos los datos de cada store
            const embudos = await getAllItems('embudos');
            const plantillas = await getAllItems('plantillasMensajes');
            const configuracionesIA = await getAllItems('configuracionesIA');
            const configuracionGlobal = await getAllItems('configuracionGlobal');

            // Creamos un objeto con toda la configuración
            const config = {
                version: CONFIG.version,
                fecha: new Date().toISOString(),
                datos: {
                    embudos,
                    plantillasMensajes: plantillas,
                    configuracionesIA,
                    configuracionGlobal
                }
            };

            return config;
        } catch (error) {
            console.error('Error al exportar la configuración:', error);
            throw error;
        }
    };

    /**
     * Importa una configuración completa
     * @param {Object} config - Configuración a importar
     * @returns {Promise<Object>} - Promesa que se resuelve cuando la importación se completa
     */
    const importarConfiguracion = async (config) => {
        if (!config || !config.datos) {
            throw new Error('El formato del archivo de configuración no es válido');
        }

        try {
            // Por seguridad, hacemos una copia de los datos actuales
            const backupConfig = await exportarConfiguracion();
            
            // Para cada store, limpiamos e importamos los nuevos datos
            const stores = ['embudos', 'plantillasMensajes', 'configuracionesIA', 'configuracionGlobal'];
            
            for (const storeName of stores) {
                if (config.datos[storeName] && Array.isArray(config.datos[storeName])) {
                    // Limpiamos el store actual
                    await clearStore(storeName);
                    
                    // Importamos los nuevos items
                    for (const item of config.datos[storeName]) {
                        await addItem(storeName, item);
                    }
                }
            }

            return { success: true, message: 'Importación completada correctamente' };
        } catch (error) {
            console.error('Error al importar la configuración:', error);
            throw error;
        }
    };

    return {
        initDB,
        addItem,
        getItem,
        getAllItems,
        updateItem,
        deleteItem,
        clearStore,
        getEmbudosConEtapas,
        getPlantillasPorTipo,
        exportarConfiguracion,
        importarConfiguracion
    };
})(); 