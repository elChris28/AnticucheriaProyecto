const sql = require('mssql');

const config = {
    user: 'adminNew', 
    password: 'abc123',
    server: 'localhost', 
    database: 'RestauranteDB', 
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    }
};

let pool = null;

async function getPool() {
    if (!pool) {
        try {
            pool = await sql.connect(config);
            console.log('Conexión exitosa a RestauranteDB');
        } catch (err) {
            console.error('Error de conexión:', err);
            throw err;
        }
    }
    return pool;
}

async function executeQuery(query, params = []) {
    try {
        const poolConnection = await getPool();
        const request = poolConnection.request();
        
        params.forEach((param, index) => {
            request.input(`param${index}`, param);
        });
        
        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error('Error ejecutando consulta:', err);
        throw err;
    }
}

async function executeQueryWithNamedParams(query, params = {}) {
    try {
        const poolConnection = await getPool();
        const request = poolConnection.request();

        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error('Error ejecutando consulta:', err);
        throw err;
    }
}

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
        console.error('Error ejecutando comando:', err);
        throw err;
    }
}

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
        console.error('Error ejecutando procedimiento:', err);
        throw err;
    }
}

async function executeTransaction(operations) {
    const poolConnection = await getPool();
    const transaction = new sql.Transaction(poolConnection);
    
    try {
        await transaction.begin();
        const results = [];
        
        for (const operation of operations) {
            const request = new sql.Request(transaction);
            
            if (operation.params) {
                Object.keys(operation.params).forEach(key => {
                    request.input(key, operation.params[key]);
                });
            }
            
            const result = await request.query(operation.query);
            results.push(result);
        }
        
        await transaction.commit();
        console.log('Transacción completada exitosamente');
        return results;
    } catch (err) {
        await transaction.rollback();
        console.error('Error en transacción, rollback ejecutado:', err);
        throw err;
    }
}

// Función para cerrar conexiones
async function closePool() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
        }
    } catch (err) {
        console.error('Error cerrando pool:', err);
    }
}

process.on('SIGINT', async () => {
    console.log('\n Cerrando aplicación...');
    await closePool();
    process.exit(0);
});

module.exports = {
    getPool,
    executeQuery,
    executeQueryWithNamedParams,
    executeNonQuery,
    executeStoredProcedure,
    executeTransaction,
    closePool,
    sql 
};

getPool()
  .then(() => {
    console.log('Módulo de base de datos cargado correctamente');
  })
  .catch(err => {
    console.error('Error al cargar módulo de base de datos:', err.message);
  });
