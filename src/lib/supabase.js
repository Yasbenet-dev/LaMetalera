// src/lib/supabase.js
// Mock client para simular Supabase usando localStorage

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const dateToYMD = (d) => d.toISOString().split("T")[0];

const todayStr = dateToYMD(today);
const yesterdayStr = dateToYMD(yesterday);

const initialData = {
  usuarios: [
    { id: "1", email: "admin@demo.com", username: "admin", nombre: "Administrador", rol: "admin", pago: 5000, tipo_pago: "Transferencia" },
    { id: "2", email: "worker@demo.com", username: "worker", nombre: "Carlos Martínez", rol: "trabajador", pago: 3500, tipo_pago: "Transferencia" },
    { id: "3", email: "pedro@demo.com", username: "pedro", nombre: "Pedro Salinas", rol: "trabajador", pago: 3000, tipo_pago: "Efectivo" },
    { id: "4", email: "juana@demo.com", username: "juana", nombre: "Juana Herrera", rol: "trabajador", pago: 3200, tipo_pago: "Transferencia" },
  ],
  perfiles: [
    { id: "1", nombre: "Administrador", rol: "admin" },
    { id: "2", nombre: "Carlos Martínez", rol: "trabajador" },
    { id: "3", nombre: "Pedro Salinas", rol: "trabajador" },
    { id: "4", nombre: "Juana Herrera", rol: "trabajador" },
  ],
  asistencias: [
    // Asistencias de ayer
    { id: "a1", user_id: "2", fecha: yesterdayStr, hora_entrada: `${yesterdayStr}T08:00:00`, hora_salida: `${yesterdayStr}T18:00:00`, lat_entrada: -33.4, lng_entrada: -70.6 },
    { id: "a2", user_id: "3", fecha: yesterdayStr, hora_entrada: `${yesterdayStr}T08:15:00`, hora_salida: `${yesterdayStr}T17:30:00`, lat_entrada: -33.4, lng_entrada: -70.6 },
    { id: "a3", user_id: "4", fecha: yesterdayStr, hora_entrada: `${yesterdayStr}T09:00:00`, hora_salida: `${yesterdayStr}T18:30:00`, lat_entrada: -33.4, lng_entrada: -70.6 },
    // Asistencias de hoy
    { id: "a4", user_id: "2", fecha: todayStr, hora_entrada: `${todayStr}T07:55:00`, hora_salida: `${todayStr}T14:00:00`, lat_entrada: -33.4, lng_entrada: -70.6 },
    { id: "a5", user_id: "3", fecha: todayStr, hora_entrada: `${todayStr}T08:10:00`, hora_salida: `${todayStr}T13:30:00`, lat_entrada: -33.4, lng_entrada: -70.6 },
    { id: "a6", user_id: "4", fecha: todayStr, hora_entrada: `${todayStr}T08:00:00`, hora_salida: null, lat_entrada: -33.4, lng_entrada: -70.6 },
  ]
};

// Inicializar localStorage usando una nueva key para forzar la actualización de la demo
if (!localStorage.getItem("mock_db_v3")) {
  localStorage.setItem("mock_db_v3", JSON.stringify(initialData));
}

function getDb() {
  return JSON.parse(localStorage.getItem("mock_db_v3"));
}

function saveDb(db) {
  localStorage.setItem("mock_db_v3", JSON.stringify(db));
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.db = getDb();
    this.data = this.db[table] || [];
    this.isInsert = false;
    this.isUpdate = false;
    this.isDelete = false;
    this.payload = null;
    this.filters = [];
    this.sorts = [];
    this.limitCount = null;
    this.isCount = false;
  }

  select(fields, { count } = {}) {
    this.isCount = count === 'exact';
    return this;
  }

  insert(payload) {
    this.isInsert = true;
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.isUpdate = true;
    this.payload = payload;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column, value) {
    this.filters.push(row => row[column] === value);
    return this;
  }

  in(column, values) {
    this.filters.push(row => values.includes(row[column]));
    return this;
  }

  gte(column, value) {
    this.filters.push(row => row[column] >= value);
    return this;
  }

  lte(column, value) {
    this.filters.push(row => row[column] <= value);
    return this;
  }

  is(column, value) {
    this.filters.push(row => row[column] === value);
    return this;
  }

  not(column, operator, value) {
    if (operator === 'is') {
      this.filters.push(row => row[column] !== value);
    } else if (operator === 'eq') {
      this.filters.push(row => row[column] !== value);
    } else {
      console.warn("Operator not implemented in mock .not():", operator);
    }
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.sorts.push({ column, ascending });
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  async single() {
    const res = await this.execute();
    if (!res.data || res.data.length === 0) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
    if (res.data.length > 1) return { data: null, error: { message: "Multiple rows returned" } };
    return { data: res.data[0], error: null };
  }

  async maybeSingle() {
    const res = await this.execute();
    if (!res.data || res.data.length === 0) return { data: null, error: null };
    return { data: res.data[0], error: null };
  }

  async then(resolve, reject) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }

  async execute() {
    let resultData = [...this.data];

    // Aplicar filtros
    for (const filter of this.filters) {
      resultData = resultData.filter(filter);
    }

    if (this.isInsert) {
      const newItems = Array.isArray(this.payload) ? this.payload : [this.payload];
      const itemsToInsert = newItems.map(item => ({ id: generateId(), ...item }));
      this.db[this.table] = [...this.data, ...itemsToInsert];
      saveDb(this.db);
      return { data: itemsToInsert, error: null };
    }

    if (this.isUpdate) {
      const updatedIds = resultData.map(r => r.id);
      this.db[this.table] = this.data.map(item => {
        if (updatedIds.includes(item.id)) {
          return { ...item, ...this.payload };
        }
        return item;
      });
      saveDb(this.db);
      const updatedData = this.db[this.table].filter(item => updatedIds.includes(item.id));
      return { data: updatedData, error: null };
    }

    if (this.isDelete) {
      const deletedIds = resultData.map(r => r.id);
      this.db[this.table] = this.data.filter(item => !deletedIds.includes(item.id));
      saveDb(this.db);
      return { data: resultData, error: null };
    }

    // Sort
    for (const sort of this.sorts) {
      resultData.sort((a, b) => {
        if (a[sort.column] < b[sort.column]) return sort.ascending ? -1 : 1;
        if (a[sort.column] > b[sort.column]) return sort.ascending ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (this.limitCount !== null) {
      resultData = resultData.slice(0, this.limitCount);
    }

    if (this.isCount) {
      return { data: resultData, count: resultData.length, error: null };
    }

    return { data: resultData, error: null };
  }
}

export const supabase = {
  from: (table) => new QueryBuilder(table),
  
  auth: {
    signInWithPassword: async ({ email, password }) => {
      // Mock login - acepta cualquier clave para usuarios existentes
      const db = getDb();
      const user = db.usuarios.find(u => u.email === email || u.username === email);
      if (user) {
        localStorage.setItem("mock_session", JSON.stringify({ user: { id: user.id, email: user.email } }));
        return { data: { user: { id: user.id, email: user.email }, session: {} }, error: null };
      }
      return { data: null, error: { message: "Invalid login credentials", code: "invalid_credentials" } };
    },
    getUser: async () => {
      const session = JSON.parse(localStorage.getItem("mock_session"));
      if (session && session.user) {
        return { data: { user: session.user }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem("mock_session");
      return { error: null };
    },
    signUp: async ({ email, password }) => {
      return { data: { user: { id: generateId(), email } }, error: null };
    }
  },

  rpc: async (fnName, payload) => {
    const db = getDb();
    
    // Implementaciones de RPC mockeadas
    if (fnName === "admin_create_asistencia") {
      db.asistencias = db.asistencias || [];
      db.asistencias.push({ id: generateId(), ...payload });
      saveDb(db);
      return { data: null, error: null };
    }
    if (fnName === "admin_update_asistencia") {
      db.asistencias = db.asistencias.map(a => a.id === payload.p_id ? { ...a, ...payload } : a);
      saveDb(db);
      return { data: null, error: null };
    }
    if (fnName === "admin_delete_asistencia") {
      db.asistencias = db.asistencias.filter(a => a.id !== payload.p_id);
      saveDb(db);
      return { data: null, error: null };
    }
    if (fnName === "admin_update_user_rate") {
      db.usuarios = db.usuarios.map(u => u.id === payload._user_id ? { ...u, pago: payload._pago, tipo_pago: payload._tipo_pago } : u);
      saveDb(db);
      return { data: null, error: null };
    }
    if (fnName === "admin_update_usuario") {
      db.usuarios = db.usuarios.map(u => u.id === payload.p_id ? { ...u, ...payload } : u);
      saveDb(db);
      return { data: null, error: null };
    }
    if (fnName === "admin_delete_usuario") {
      db.usuarios = db.usuarios.filter(u => u.id !== payload.p_id);
      saveDb(db);
      return { data: null, error: null };
    }
    
    console.warn("RPC no implementado en el mock:", fnName);
    return { data: null, error: null };
  }
};
