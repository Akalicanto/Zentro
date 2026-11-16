# Integración opcional con Habita

Se añade `GET /api/integrations/habita/v1/snapshot`, autenticado exclusivamente con `Authorization: Bearer <token>`. Configura `Zentro__Habita__Token` (al menos 32 caracteres aleatorios) o el archivo privado ignorado `Zentro.Api/Data/habita.local.json`:

```json
{"Zentro":{"Habita":{"Token":"un-secreto-aleatorio-de-al-menos-32-caracteres"}}}
```

Las variables de entorno prevalecen. El archivo privado tiene recarga automática. No guardes secretos reales en este documento ni en Git.

El token solo autoriza GET en esa ruta exacta, también en desarrollo. No permite leer `/api/state`, escribir, iniciar sesión ni usar otros endpoints en producción. Si falta token, la integración permanece cerrada. No cambia la autenticación existente, el modelo ni los datos financieros.

El contrato versión 1 devuelve EUR en céntimos: ahorro total, líquido sin depósitos, depósitos/vencimientos, capital invertido (sin valoración de mercado), patrimonio según las reglas existentes de Zentro, referencia salarial, cuotas externas por mes, deuda interna separada, distribución de cuentas, aportaciones históricas y plan. La oferta hipotecaria se etiqueta siempre como estimación. Datos opcionales de entidad/plazo solo se incluyen si el modelo los proporciona.

No devuelve conceptos ni movimientos diarios individuales. Expone carencias (sin historial de nóminas/consumo ni valoración de fondos), no fabrica datos. El saldo diario y el efectivo son informativos y no se agregan al ahorro para comprar. El vencimiento de depósitos requiere confirmación de disponibilidad en Habita.

Admite `If-None-Match`/ETag y responde 304 si el perfil no ha cambiado; 204 cuando no hay perfil. Habita conserva el último éxito si Zentro deja de responder. Habita utiliza una base independiente y nunca llama a PUT del estado financiero.

Prueba con SQLite temporal y datos sintéticos:

```powershell
dotnet build Zentro.Api -o checks/habita-api
node tests/integration/habita.test.mjs
```

La implementación de Habita y el contrato ampliado se documentan en su [repositorio independiente](https://github.com/Akalicanto/Habita).
