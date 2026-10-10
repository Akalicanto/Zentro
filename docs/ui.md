# Componentes y estilo

Zentro utiliza Material UI para su base común de botones, superficies, insignias y ayudas. Motion anima navegación, desplegables y modales. Los componentes financieros conservan su composición propia.

| Qué cambiar                                     | Dónde                                   |
| ----------------------------------------------- | --------------------------------------- |
| Paleta clara/oscura y fuentes                   | `Zentro.Front/src/shared/ui/tokens.css` |
| Controles Material UI, bordes, formas y estados | `Zentro.Front/src/shared/ui/theme.ts`   |
| Duración de las transiciones principales        | `motionSettings` en `theme.ts`          |
| Componentes reutilizables y proveedores         | `Zentro.Front/src/shared/ui/index.tsx`  |
| Tarjetas de cifras, modales y ayuda             | `Zentro.Front/src/shared/components/`   |
| Microinteracciones de tablas y tarjetas         | `Zentro.Front/src/styles/motion.css`    |

Las páginas importan `Button`, `Surface`, `Badge`, `Tooltip`, `Stack` y `Box` desde `shared/ui/`. Los ajustes comunes se hacen en el tema, evitando copiar variantes de controles en cada página. El CSS restante describe la distribución y los componentes propios de cada apartado; no se ha añadido Bootstrap ni una segunda biblioteca de controles.

Las animaciones son breves y respetan `prefers-reduced-motion`. No se animan cálculos ni importes financieros. Los modales conservan el bloqueo del fondo durante su salida y los gráficos no se vuelven a dibujar al abrirlos. Las dependencias se separan en paquetes de interfaz, animación, gráficos y bibliotecas compartidas para reutilizar la caché.

## Cobros de deudas

En crear/editar deuda puede elegirse un día del 1 al 31. Si no existe en el mes, se utiliza su último día, incluidos años bisiestos. Los registros anteriores pueden conservar «Sin día definido» hasta configurarlos.

`DebtPaymentWatch` se comparte entre Mi espacio, Deudas y la ficha individual. Muestra las cuotas de este mes y el siguiente, además del importe vencido. Una cuota marcada pagada antes de vencer aparece adelantada; el dinero apartado continúa pendiente. Los estados se calculan sobre los registros del usuario y no suponen una conexión bancaria. Los adelantos de capital del simulador se reflejan en el calendario resultante y se distinguen de marcar una cuota mensual como pagada.

Referencias: [tema de Material UI](https://mui.com/material-ui/customization/theme-components/) y [animaciones accesibles de Motion](https://motion.dev/docs/react-accessibility).
