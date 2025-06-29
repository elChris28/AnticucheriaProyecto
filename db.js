const sql = require('mssql');

const config = {
    user: 'adminNew', // Reemplaza con tu usuario de SQL Server
    password: 'abc123', // Reemplaza con tu contraseña de SQL Server
    server: 'localhost', // o tu dirección de servidor SQL
    database: 'RestauranteDB', // Reemplaza con tu base de datos
    options: {
        encrypt: true, // Si es necesario para tu servidor
        trustServerCertificate: true // Cambiar según el entorno
    }
};

// Variable para mantener el pool de conexiones
let pool = null;

// Función para obtener el pool de conexiones
async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('✅ Conexión exitosa a RestauranteDB');
    }
    return pool;
  } catch (err) {
    console.error('❌ Error de conexión:', err);
    throw err;
  }
}

// Función para ejecutar consultas SELECT
async function executeQuery(query, params = []) {
  try {
    const poolConnection = await getPool();
    const request = poolConnection.request();
    
    // Agregar parámetros numerados
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('❌ Error ejecutando consulta:', err);
    throw err;
  }

  
}

// Función para ejecutar consultas con parámetros nombrados
async function executeQueryWithNamedParams(query, params = {}) {
  try {
    const poolConnection = await getPool();
    const request = poolConnection.request();
    
    // Agregar parámetros con nombre
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('❌ Error ejecutando consulta:', err);
    throw err;
  }
}

// Función para INSERT/UPDATE/DELETE que retorna filas afectadas
async function executeNonQuery(query, params = []) {
  try {
    const poolConnection = await getPool();
    const request = poolConnection.request();
    
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    const result = await request.query(query);
    return result.rowsAffected[0];
  } catch (err) {
    console.error('❌ Error ejecutando comando:', err);
    throw err;
  }
}

// Función para ejecutar procedimientos almacenados
async function executeStoredProcedure(procedureName, params = {}) {
  try {
    const poolConnection = await getPool();
    const request = poolConnection.request();
    
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.execute(procedureName);
    return result.recordset;
  } catch (err) {
    console.error('❌ Error ejecutando procedimiento:', err);
    throw err;
  }
}

// Función para transacciones
async function executeTransaction(operations) {
  const poolConnection = await getPool();
  const transaction = new sql.Transaction(poolConnection);
  
  try {
    await transaction.begin();
    const results = [];
    
    for (const operation of operations) {
      const request = new sql.Request(transaction);
      
      // Agregar parámetros si existen
      if (operation.params) {
        Object.keys(operation.params).forEach(key => {
          request.input(key, operation.params[key]);
        });
      }
      
      const result = await request.query(operation.query);
      results.push(result);
    }
    
    await transaction.commit();
    console.log('✅ Transacción completada exitosamente');
    return results;
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error en transacción, rollback ejecutado:', err);
    throw err;
  }
}

// Función de prueba de conexión
async function testConnection() {
  try {
    const result = await executeQuery(`
      SELECT 
        @@VERSION as version, 
        GETDATE() as fecha,
        DB_NAME() as database_name,
        USER_NAME() as user_name
    `);
    
    console.log('🔍 Prueba de conexión exitosa:');
    console.log('📅 Fecha del servidor:', result[0].fecha);
    console.log('🗄️ Base de datos:', result[0].database_name);
    console.log('👤 Usuario:', result[0].user_name);
    console.log('🖥️ Versión SQL Server:', result[0].version.substring(0, 50) + '...');
    return true;
  } catch (err) {
    console.error('❌ Fallo en prueba de conexión:', err.message);
    return false;
  }
}

// Función para obtener información de las tablas
async function getTableInfo() {
  try {
    const tables = await executeQuery(`
      SELECT 
        TABLE_NAME as tabla,
        TABLE_TYPE as tipo
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 Tablas en la base de datos:');
    tables.forEach(table => {
      console.log(`  - ${table.tabla}`);
    });
    
    return tables;
  } catch (err) {
    console.error('❌ Error obteniendo información de tablas:', err);
    return [];
  }
}

// Función para cerrar conexiones
async function closePool() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('🔌 Pool de conexiones cerrado');
    }
  } catch (err) {
    console.error('❌ Error cerrando pool:', err);
  }
}

// Manejo de eventos de cierre de aplicación
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando aplicación...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando aplicación...');
  await closePool();
  process.exit(0);
});

// Exportar funciones
module.exports = {
  getPool,
  executeQuery,
  executeQueryWithNamedParams,
  executeNonQuery,
  executeStoredProcedure,
  executeTransaction,
  testConnection,
  getTableInfo,
  closePool,
  sql // Para acceder a tipos de datos SQL
};

// Probar conexión al cargar el módulo
getPool()
  .then(() => {
    console.log('🚀 Módulo de base de datos cargado correctamente');
  })
  .catch(err => {
    console.error('🚨 Error al cargar módulo de base de datos:', err.message);
  });