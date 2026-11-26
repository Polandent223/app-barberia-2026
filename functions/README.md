# SAMBRIX POS — fase de servidor, no desplegada

El punto de venta permanece deshabilitado mientras `platform/config.shopServerEnabled` no sea exactamente true. No habilitarlo en producción ni publicar la rama hasta superar staging.

## Arquitectura
- El navegador invoca exclusivamente `sambrixSellProducts` / `sambrixReturnProducts` (us-central1).
- La identidad proviene del token verificado de Firebase Auth, no del formulario.
- La función verifica en la misma transacción la empresa, perfil, miembro, cargo, estado, plan pro/premium y vencimiento.
- Los precios y saldos provienen de Firestore. Cada recibo admite hasta 3 referencias.
- La solicitud UUID se conserva localmente para reintentos y el servidor calcula el ID de operación y hash del contenido. Una repetición idéntica devuelve el mismo resultado; una distinta con el mismo ID se rechaza.
- Una venta modifica inventario, recibos, caja y auditoría en una transacción. Una devolución integral solo admite mercancía recibida en condiciones de volver a stock, sin ajuste financiero anterior; conserva el recibo original y crea corrección y egreso.
- No se ejecutan pagos bancarios.
- Los pedidos online nuevos y sus reservas/cancelaciones siguen deshabilitados; se admiten pedidos existentes que ya están en Firestore.
- Las funciones sambrixShopStatus y sambrixCancelShopRequest consultan o cancelan una solicitud del mismo usuario/empresa. La cancelación crea una marca terminal en la misma ruta que usa el cobro; si ya existe un cobro o devolución devuelve el resultado original. Si el servidor no responde, conservar la solicitud y contactar soporte.

## QA
Las reglas experimentales de escritura desde navegador se conservan en tests/experimental. No desplegarlas: excedieron el límite de evaluación de Firestore.
El archivo activo de reglas conserva el esquema validado de inventario y finanzas, con rechazo de filas POS directas.
`npm test` comprueba las regresiones puras y el navegador se comprueba en CI. El emulador de Firestore prueba el servicio con un contexto privilegiado de ensayo y usuarios ficticios, no con un endpoint callable desplegado. El job server-check instala y carga el paquete. El job callable-pos arranca Auth, Functions y Firestore juntos y crea usuarios ficticios para invocar los endpoints por HTTP mediante el SDK de Firebase. CI #295 aprobó la primera prueba callable; las nuevas opciones de consulta y cancelación se prueban en CI #304.
Para un entorno de ensayo específico, usar firebase.shop.json con emuladores y proyecto demo; nunca usar el proyecto de producción para las pruebas. La configuración de funciones está separada deliberadamente de firebase.json. No activar el indicador en una empresa real antes de verificar Auth, endpoint, datos y permisos en staging.

## Pendiente
Validar despliegue de endpoints en staging separado con Firebase Auth y confirmar CI de consulta/cancelación; conciliación de solicitudes pendientes por soporte, copias/restauración de metadatos de tienda y correcciones, ventas de más de tres referencias, devoluciones parciales por producto, restauración de productos archivados, tienda pública, disponibilidad pública tras ventas de cajero, moneda y zona horaria (UTC si no configurada), prueba de volumen y facturación del servicio antes de desplegar. Las reglas antiguas de movimientos financieros ordinarios no constituyen un libro contable granular totalmente inmutable.
