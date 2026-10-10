# Pixel 9 Pro en Firefox

En el modo adaptable (`Ctrl + Mayús + M`), abre el selector de dispositivos, elige **Editar lista** y **Añadir dispositivo personalizado**. Guarda:

| Opción            | Valor                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Nombre            | Pixel 9 Pro · Firefox                                                  |
| Ancho             | 427                                                                    |
| Alto              | 876                                                                    |
| DPR               | 3                                                                      |
| Pantalla táctil   | Activada                                                               |
| Agente de usuario | `Mozilla/5.0 (Android 14; Mobile; rv:157.0) Gecko/157.0 Firefox/157.0` |

Marca el dispositivo en la lista y pulsa Guardar. Quedará disponible en ese perfil de Firefox. El Firefox abierto desde el acceso directo de Zentro utiliza un perfil propio; añádelo en esa ventana.

427 × 876 son píxeles CSS útiles, siguiendo el [descriptor de Pixel 9 Pro de Microsoft Playwright](https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json); la pantalla completa del descriptor mide 427 × 952. El espacio útil cambia con la barra del navegador y los ajustes de tamaño del teléfono. El agente anterior corresponde a Firefox 157; actualiza la versión si cambia tu navegador.

Las pruebas Android/PWA de Zentro utilizan ese mismo tamaño y DPR, además de las comprobaciones existentes en pantallas más estrechas. La emulación no sustituye probar el teléfono físico. Mozilla explica la creación de dispositivos en su [documentación de modo adaptable](https://firefox-source-docs.mozilla.org/devtools-user/responsive_design_mode/index.html#creating-custom-devices).
