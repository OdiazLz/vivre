# Propuesta de mejoras de producto y diseño

Documento de ideas para priorizar. No implica que las funcionalidades estén aprobadas ni implementadas.

## Mejoras funcionales

### WhatsApp para residentes

- Agrupar el menú en Mi cuenta (saldo, estado de cuenta y pagos), Servicios (incidencias, eventos y reglamento), Comunidad (avisos, asambleas y votaciones) y Acceso y visitas.
- Mostrar Acceso y visitas solo cuando la privada tenga habilitada la capacidad correspondiente.
- Añadir “Mis solicitudes” para consultar el estado de incidencias, comprobantes y eventos.
- Añadir confirmación de lectura de avisos y encuestas breves cuando administración necesite medir recepción o recopilar opiniones.

### Gestión gerencial

- Resumen de pendientes: comprobantes por revisar, incidencias abiertas, eventos por aprobar y tareas vencidas, con enlaces directos a su resolución.
- Morosidad accionable: antigüedad de saldos, evolución mensual y seguimiento de compromisos de pago.
- Presupuesto frente a gasto real por categoría, con alertas de límites.
- Aprobación configurable de gastos con comprobante, responsable y registro de cambios.
- Seguimiento de incidencias por prioridad, responsable, antigüedad y fecha objetivo.
- Informes periódicos para comité o residentes, limitados a los datos autorizados para cada audiencia.

### Capacidades configurables por privada

- Configurar capacidades como caseta, control de tarjetas, pases de visitante y SOS.
- Mostrar en WhatsApp y en la interfaz solo las funciones habilitadas.
- Validar también en el backend que cada operación esté habilitada; no depender solo de ocultar botones.
- Integrar control de tarjetas o portón únicamente después de conocer el hardware y el protocolo disponibles.

## Propuesta de diseño

- **Conservar la dirección visual actual:** el login dividido entre panel oscuro de marca y formulario claro, junto con la barra lateral oscura y el contenido claro, ofrece una base moderna. No hace falta un rediseño radical.
- **Unificar la paleta de marca:** el login usa `#111936`, la navegación `#162033` y el índigo aparece en los acentos. Definir un tono oscuro y un índigo principales compartidos, con variantes en tokens, para que todas las pantallas mantengan la misma identidad.
- **Reservar colores semánticos para estados:** verde para éxito, ámbar para atención y rojo para error o acciones destructivas. No usar esos colores como decoración genérica; acompañar siempre el color con texto o icono.
- **Aclarar la personalización del login:** confirmar que la edición del logotipo se guarde y explicar qué cambia. Si solo es una vista previa o no está conectada, ocultarla o convertirla en una función real de configuración.
- **Dar jerarquía a la navegación:** agrupar los módulos por Operación, Comunidad y Administración; conservar las opciones permitidas por rol y facilitar el acceso a los módulos más utilizados.
- **Hacer el inicio más accionable:** priorizar pendientes y alertas sobre tarjetas meramente informativas. Cada indicador debería llevar al listado filtrado correspondiente.
- **Unificar el lenguaje visual:** centralizar colores, espaciado, tipografía, radios y estilos de botones en tokens compartidos. El tema ya define colores en `src/index.css`, pero varios componentes aplican colores directamente en sus clases o estilos.
- **Mejorar consistencia entre módulos:** usar patrones comunes para encabezados, filtros, tablas, estados vacíos, carga, errores, formularios y confirmaciones.
- **Diseñar primero para móvil y caseta:** objetivos táctiles grandes, acciones frecuentes visibles, contraste legible y menos dependencia de tablas anchas.
- **No depender de hover en móvil:** mantener las acciones importantes —como abrir un comprobante— visibles o accesibles mediante un menú táctil.
- **Mejorar accesibilidad:** foco visible, etiquetas para controles, mensajes de estado anunciables, navegación por teclado y no depender solo del color para comunicar estados.
- **Añadir estados útiles:** diferenciar “sin datos”, “cargando”, “error” y “sin permiso”; mostrar fecha de actualización en métricas operativas.
- **Revisar las acciones rápidas:** `QuickActions.tsx` tiene acciones de ejemplo que solo ejecutan `console.log`; conectarlas a acciones reales o quitarlas si no se usan.
- **Retirar estilos de plantilla que ya no correspondan:** `src/App.css` todavía contiene estilos del starter de Vite; confirmar si se usa y eliminarlo o reemplazarlo para evitar estilos heredados confusos.

## Orden sugerido

1. Conectar o retirar las acciones de ejemplo y resolver inconsistencias visuales evidentes, incluida la consistencia de la paleta y las acciones táctiles.
2. Añadir resumen gerencial de pendientes con accesos directos.
3. Mejorar seguimiento de incidencias y consultas de “Mis solicitudes” por WhatsApp.
4. Configurar capacidades por privada y habilitarlas de forma gradual.
5. Añadir reportes financieros avanzados y notificaciones programadas según permisos.

## Criterios para evaluar el rediseño

- El personal puede encontrar y completar sus tres tareas más frecuentes desde el inicio sin navegar por módulos innecesarios.
- Un usuario entiende de un vistazo qué requiere atención y qué puede esperar.
- Las pantallas principales siguen siendo utilizables en móvil y en una pantalla de caseta.
- Roles distintos solo ven las acciones que pueden realizar, y los estados se entienden sin depender del color.
