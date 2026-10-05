# La Metalera - AsisControl 🏭

Plataforma moderna para el control de asistencia, horarios y pagos del personal. Creada con **React**, **Vite** y **TailwindCSS**. 

Originalmente desarrollada utilizando **Supabase** como backend, esta versión ha sido adaptada para funcionar **100% en local como Demo**, utilizando un mock que almacena la información directamente en tu navegador (`localStorage`), permitiendo probar todas sus funcionalidades sin necesidad de una base de datos conectada.

---

## 🚀 Características Principales

- **Control de Asistencia:** Registro detallado de entradas y salidas con cálculo automático de horas.
- **Gestión de Pagos:** Cálculo en tiempo real de remuneraciones basado en valor-hora y horas trabajadas.
- **Roles de Usuario:**
  - **Administrador:** Acceso completo al Dashboard, Asistencias, Usuarios, Horarios y Pagos.
  - **Trabajador:** Acceso restringido para ver sus asistencias.
- **Filtros Avanzados y Exportación PDF:** Generación de reportes detallados en un click.

---

## 💻 ¿Cómo ejecutar en local (Demo Mode)?

Esta versión no requiere variables de entorno ni configuración de base de datos. Todo funciona al instante:

1. Clona el repositorio o descárgalo.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

El proyecto se abrirá en `http://localhost:5173`.

---

## 🔑 Credenciales de Prueba

Al ingresar a la pantalla de inicio, encontrarás un botón llamado **"Rellenar datos"** que ingresa automáticamente las credenciales de administrador, o bien puedes usar:

- **Usuario:** `admin@demo.com`
- **Contraseña:** `cualquiera123` (Cualquier clave es válida en el entorno de prueba)

Una vez dentro, el sistema inyectará datos de prueba (trabajadores, tarifas, asistencias y pagos) para que puedas navegar por los paneles como si la aplicación tuviera meses de uso.

---

## 🛠️ Tecnologías utilizadas

- **Frontend:** React.js, Vite
- **Estilos:** Tailwind CSS
- **Routing:** React Router DOM
- **Íconos & Componentes UI:** Heroicons / Custom SVG
- **Reportes:** jsPDF, jsPDF-AutoTable
- **Backend (Original):** Supabase Auth & PostgreSQL
- **Backend (Demo):** Mock local (`localStorage`)

---

*Nota: Para reconectar el proyecto a un proyecto de Supabase real, revisa el archivo `src/lib/supabase.real.js` donde se encuentra la lógica original.*
