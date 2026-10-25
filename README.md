# Envíos YA! - Motor de Tasas Binance P2P y Generador de Flyers

Plataforma integral web y automatizada para cálculo de tasas de cambio internacionales en tiempo real basadas en el libro de órdenes P2P de Binance, con protección de márgenes de ganancia y generador instantáneo de flyers en alta definición idénticos a tu plantilla oficial.

---

## 🚀 Cómo Iniciar la Plataforma

Puedes iniciar la plataforma de dos formas:

### Opción 1: Con 1 solo clic (Recomendado)
Haz doble clic sobre el archivo ejecutable:
```text
iniciar_calculadora.bat
```
Esto abrirá automáticamente tu navegador en **http://localhost:8000** y pondrá el motor a funcionar.

### Opción 2: Desde la consola / PowerShell
```powershell
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

---

## 📊 Reglas de Cálculo y Lógica Implementada

1. **Conexión a Binance P2P:**
   * Consulta directa al libro de órdenes público de Binance sin necesidad de API keys de trading.
   * Filtros de seguridad aplicados:
     * Omitir los primeros **3 anunciantes** para evitar órdenes señuelo o cuentas con montos irreales.
     * Muestreo y promedio de **8 a 10 comerciantes** calificados con tasa de éxito $> 88\%$.
     * Filtros de volumen mínimo (ej. a partir de 100.000 CLP en compra, montos seguros en venta de VES, COP, etc.).

2. **Fórmula de Tasa de Adquisición:**
   $$\text{Tasa Adquisición} = \frac{\text{Tasa Venta Destino (ej. VES/USDT)}}{\text{Tasa Compra Origen (ej. CLP/USDT)}}$$

3. **Márgenes de Comisión Configurables:**
   * **Tasa Estándar (-7.0%):**
     $$\text{Tasa Cliente} = \text{Tasa Adquisición} \times (1 - 0.070)$$
   * **Tasa Preferencial (-6.3%):**
     Para montos mayores a $100.000 CLP:
     $$\text{Tasa Preferencial} = \text{Tasa Adquisición} \times (1 - 0.063)$$

4. **Monitor de Variación de Mercado (Drift & Profit Shield):**
   * Al descargar o fijar un **Snapshot**, el sistema guarda la "foto" de las tasas que publicaste.
   * En tiempo real compara el mercado actual contra tu publicación:
     * **Verde (Seguro):** Tu margen de ganancia se mantiene intacto o crece a tu favor.
     * **Amarillo (Alerta):** Ligera variación en el mercado.
     * **Rojo (Peligro):** Caída brusca en Binance donde tu margen se reduce por debajo del mínimo de seguridad.

5. **Generador Gráfico de Flyers:**
   * Renderizado vectorial idéntico a tu flyer oficial de **Zelle / Envíos YA!**:
     * Banderas 3D esféricas con brillos y reflejos.
     * Flechas 3D metálicas con los valores numéricos actualizados.
     * WhatsApp `+56 973614725`, textos comerciales y marca.
   * **Descarga individual en PNG HD (1440x2160)** con un clic.
   * **Descarga de todos los flyers en un archivo ZIP** en un solo botón.
