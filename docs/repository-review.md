# Revisión del repositorio

Revisión de código, referencias, estilos, configuración, paquetes, persistencia y pruebas del 10 de octubre de 2026. Se utiliza exclusivamente información ficticia para verificar cambios.

## Estructura y decisiones

| Carpeta                                          | Resultado                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `Zentro.Api/Controllers`                         | Rutas y respuestas HTTP. Se mantiene separada de reglas y SQL.                                             |
| `Zentro.Api/Models`                              | Contrato financiero tipado. El número de modelos permite mantener una carpeta común.                       |
| `Zentro.Api/Services`                            | Coordinación del caso de uso de lectura y guardado mediante interfaces.                                    |
| `Zentro.Api/Validation/Rules`                    | Reglas por área y comprobaciones cruzadas antes de persistir.                                              |
| `Zentro.Api/Infrastructure/Persistence`          | Conexiones, repositorio y sesiones con transacciones. Los stores separan cada mapeo SQL.                   |
| `Zentro.Api/Infrastructure/Persistence/Schema`   | Se conservan todas las migraciones publicadas; no se modifican retrospectivamente.                         |
| `Zentro.Api/Properties`, `Extensions`, `OpenApi` | Configuración de arranque, registro de dependencias y contrato Swagger utilizados.                         |
| `Zentro.Api/Data`                                | Datos privados; se conserva y permanece excluida de Git.                                                   |
| `Zentro.Front/src/app`                           | Composición, navegación y estructura común.                                                                |
| `Zentro.Front/src/features`                      | Organización por funcionalidades; historial compartido entre ahorro e inversión.                           |
| `Zentro.Front/src/domain`                        | Reglas y cálculos puros, independientes de React y de HTTP.                                                |
| `Zentro.Front/src/shared`                        | Transporte, utilidades y componentes reutilizables. Se extrae el selector de mes duplicado.                |
| `Zentro.Front/src/styles`                        | Cascada explícita por área. Se retiran 32 selectores sin consumidores confirmados.                         |
| `Zentro.Front/public`                            | Los dos logos, iconos PWA y logos bancarios tienen consumidores y se conservan.                            |
| `tests`, `Zentro.Front/tests`                    | Integración, migración, dominio e interfaz con datos sintéticos. Se conservan por su cobertura funcional.  |
| `scripts`, `.vscode`                             | Arranque conjunto, acceso directo, pruebas y exportación de marca utilizados.                              |
| `docs`                                           | Documentación técnica y originales de marca necesarios para reproducir los recursos.                       |
| `checks`, `node_modules` en la raíz              | Artefactos temporales y caché antigua; se retiran. Las pruebas recrean `checks` cuando necesitan capturas. |

La estructura actual es adecuada para una aplicación personal de este tamaño. Mantener un proyecto .NET y un frontend evita introducir capas sin responsabilidad propia. No se necesitan proyectos separados de dominio, aplicación e infraestructura ni un ORM para sustituir consultas pequeñas, parametrizadas y ya cubiertas por pruebas. Si aparecen varios casos de uso independientes, convendrá separar sus servicios y endpoints.

## Correcciones funcionales

- Guardado pendiente: las escrituras se ordenan, se omiten snapshots sustituidos antes de enviarse, los errores antiguos no reemplazan el estado de cambios posteriores y una escritura correcta limpia el aviso de error.
- Recuperación: una copia pendiente se normaliza antes de enviarse a la API. Solo se elimina del navegador si sigue siendo la copia enviada.
- Errores: se muestran los motivos de validación que devuelve la API. Si el almacenamiento del navegador falla, el cambio no se anuncia como guardado.
- Importes: conversión decimal y suma exacta de céntimos mediante enteros grandes; se rechazan totales que excedan la precisión segura. La API verifica también los totales diarios, de deudas y de posibles gastos.
- Plan: un horizonte superior a 600 meses se rechaza explícitamente, en lugar de mostrar un calendario truncado. El último mes del año 9999 no genera un mes inválido al terminar el recorrido.
- Importación: filas nulas, conceptos de otro tipo e identificadores vacíos se rechazan con mensajes comprensibles.
- Formularios: los conceptos utilizan teclado de texto en móvil. El selector mensual es común y conserva sus etiquetas accesibles y bloqueo al editar un mes existente.
- SQLite: una conexión que falle durante su apertura se libera antes de propagar el error. La carpeta privada `Data` también se excluye por completo de la compilación y publicación de la API.
- Limpieza: se retira la configuración de desarrollo que duplicaba la configuración base, un tipo exportado sin uso, estilos obsoletos y llaves JSX innecesarias. Los nombres del calendario de deudas dejan de hacer referencia exclusivamente al dentista.

## Compatibilidad que se conserva

`LegacyProfileReader` solo sirve para migrar formatos antiguos. Los estados diarios anteriores, las aproximaciones importadas y los compromisos del contrato se conservan para no descartar datos de copias anteriores. No se utiliza JSON dentro de columnas de la base actual. Tampoco se añaden datos de demostración al arrancar.

## Límites y siguientes pasos

El contrato HTTP sigue guardando el perfil completo. Editar simultáneamente desde dos pestañas o dispositivos puede sobrescribir cambios; antes de sincronización multiusuario o multidispositivo, la prioridad es añadir control de versión y resolución de conflictos. La API sigue preparada para uso local: una publicación requiere autenticación. Estas capacidades no se introducen como parte de esta limpieza.

Las fuentes actuales proceden de Google Fonts y tienen alternativas locales de sistema. Servirlas desde el proyecto sería una mejora posterior para evitar esa dependencia al cargar la interfaz sin internet.

## Verificación

Han pasado 35 pruebas unitarias, la integración de API y migraciones, los flujos de navegador, la emulación Android/PWA y la revisión de formato. React/TypeScript y .NET compilan sin errores; la publicación Release no contiene la carpeta `Data` ni bases privadas. Las auditorías de Node y .NET no han encontrado vulnerabilidades conocidas. Los procesos de prueba utilizan bases temporales y se detienen al terminar.
