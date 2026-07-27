import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "./types";
import { CLOCK_COUNT } from "@/clocks/registry";

/**
 * El manual de GLU en español (ADR 44) — traducción del original inglés, que
 * es el texto desde el que se traduce cada idioma.
 *
 * Reglas de edición: escrito para quien tiene la tablet delante, no para quien
 * revisa la arquitectura. Los detalles internos solo aparecen cuando cambian lo
 * que alguien debería *esperar*. Los números de ADR nunca aparecen en el texto.
 */
const updated = "26 de julio de 2026";

const title = "Cómo funciona GLU";

const intro = (
  <>
    GLU es un temporizador de concentración pensado para una tablet apoyada a tu
    lado mientras trabajas. Esta página recoge todo lo que hace: el temporizador,
    la galería de relojes, las etiquetas de entorno, el registro de sesiones y la
    conexión opcional con Todoist. Es una sola página a propósito: usa la
    búsqueda en la página de tu navegador para moverte por ella.
  </>
);

const sections: LegalSection[] = [
  {
    heading: "Qué es GLU",
    body: (
      <>
        <p>
          Un pomodoro y registro de concentración. Eliges una duración, pulsas
          Iniciar y trabajas hasta que el reloj llega a cero. GLU guarda la
          sesión para que veas cuántas llevas hoy y —si conectas Todoist— puede
          anotar el tiempo en la tarea en la que estabas trabajando.
        </p>
        <p>
          <b>No hay cuenta ni registro</b>. Todo lo que GLU sabe vive en el
          navegador desde el que lees esto. Es una sola pantalla: sin menús en
          los que perderse, sin panel de control, sin nada que configurar antes
          de que sirva.
        </p>
        <p>
          La primera vez que abres GLU verás una breve introducción en lugar del
          temporizador, con un botón que te lleva dentro. La ves <b>una vez por
          navegador</b>; después GLU abre directamente el reloj. Sigue disponible
          en <LegalLink href="/welcome">la página de bienvenida</LegalLink> por si
          la quieres releer o enviársela a alguien. Borrar los datos del
          navegador la reinicia junto con todo lo demás, así que GLU volverá a
          recibirte como si fueras nuevo.
        </p>
      </>
    ),
  },
  {
    heading: "Instálalo como una app",
    body: (
      <p>
        GLU se puede instalar en la pantalla de inicio o en el escritorio
        —«Instalar aplicación» en el menú del navegador en Android, «Añadir a
        pantalla de inicio» en un iPad, el control de instalación en la barra de
        direcciones en un navegador de escritorio— y a partir de ahí se abre sin
        el marco del navegador, que es el aspecto adecuado para un temporizador
        en un soporte. En Android, elige la opción que dice <i>Instalar</i> cuando
        aparezcan las dos: el acceso directo simple deja una barra del navegador
        arriba. <b>No es una app sin conexión</b>: necesita conexión cada vez que
        arranca. Nada más cambia; es la misma app, con los mismos datos, en otra
        ventana.
      </p>
    ),
  },
  {
    heading: "El temporizador",
    body: (
      <>
        <p>
          La fila que hay sobre el reloj contiene las duraciones predefinidas:{" "}
          <b>5, 10, 15, 20, 30, 45 y 60 minutos</b>. Al llegar por primera vez
          está seleccionada la de veinte. Tocar una duración ajusta el
          temporizador, y tocar una <i>durante</i> una sesión reajusta esa sesión
          en lugar de esperar a que termine.
        </p>
        <p>
          Debajo del reloj hay dos botones —los objetivos más grandes de la
          pantalla, porque son los que buscas sin mirar—. El primero siempre dice
          lo que va a hacer: <b>Iniciar</b> cuando no hay nada en marcha,{" "}
          <b>Pausar</b> mientras lo hay, <b>Reanudar</b> una vez que has pausado.
          El segundo es <b>Detener</b>. Debajo, <b>+1 / +5 / −1 / −5</b>, que
          significan una de dos cosas según lo que esté haciendo el temporizador.
        </p>
        <p>
          <i>Durante</i> una sesión ajustan la sesión en la que estás, y solo esa:
          al detenerla vuelves a la duración que elegiste. Sin nada en marcha, lo
          que incluye estar en 00:00 después de que una sesión haya terminado,
          definen cuánto durará la <b>siguiente</b> sesión. Una duración que no
          sea una de las siete predefinidas aparece en la fila como un botón
          propio, seleccionado, y ahí se queda mientras inicias, detienes y
          vuelves a empezar, hasta que toques otra duración. Un minuto es la
          sesión más corta que GLU mantiene; restar por debajo de eso en un reloj
          que ya está contando simplemente termina la sesión.
        </p>
        <DataList
          items={[
            {
              term: "Inactivo",
              detail:
                "Nada en marcha. El reloj muestra la duración que has seleccionado, lista para empezar.",
            },
            {
              term: "En marcha",
              detail:
                "Contando hacia atrás. Los números no bailan: los dígitos mantienen su anchura.",
            },
            {
              term: "En pausa",
              detail:
                "Detenido donde lo dejaste. Pulsa Reanudar para seguir desde el mismo segundo.",
            },
            {
              term: "Terminado",
              detail:
                "Cero, y visiblemente distinto de inactivo. Nada se reinicia solo: la siguiente sesión la decides tú.",
            },
          ]}
        />
        <p>
          <b>
            El temporizador sobrevive a una recarga, a cerrar la tapa y a una
            pestaña en segundo plano.
          </b>{" "}
          Cuenta desde el momento en que empezó, no a partir de pulsos que
          necesita estar despierto para recibir, así que al volver a la pestaña
          verás el tiempo restante correcto y no un reloj que se paró cuando lo
          hizo la pantalla. Si una sesión venció mientras estabas fuera, la
          encontrarás terminada y en silencio: el sonido es para el momento en
          que ocurre, no para horas después.
        </p>
      </>
    ),
  },
  {
    heading: "Atajos de teclado",
    body: (
      <>
        <p>Si tienes un teclado conectado:</p>
        <DataList
          items={[
            { term: "P", detail: "Pausar, o reanudar una sesión en pausa." },
            { term: "S", detail: "Detener la sesión actual." },
            {
              term: "N",
              detail:
                "Abandonar lo que esté en marcha y empezar una sesión nueva con la duración seleccionada.",
            },
            {
              term: "Ctrl + C",
              detail:
                "También detiene: la costumbre heredada de la terminal. Si tienes texto seleccionado, copia en su lugar, exactamente como esperarías.",
            },
          ]}
        />
        <p>
          Los atajos nunca se activan mientras escribes en un campo de texto, y
          mantener una tecla pulsada no repite la acción. Detener indica su atajo
          en un tooltip, y también lo hace el primer botón en cuanto hay una
          sesión que pausar o reanudar, así que no hay nada que memorizar de esta
          página.
        </p>
      </>
    ),
  },
  {
    heading: "El reloj es una galería",
    body: (
      <>
        <p>
          Hay <b>{CLOCK_COUNT} diseños de reloj</b>, y el que está en pantalla es
          una elección, no un valor por defecto con el que tengas que cargar.{" "}
          <b>Desliza el reloj hacia los lados</b> para recorrerlos; en una
          pantalla ancha hay además flechas a ambos lados del reloj, tenues hasta
          que pasas el cursor o las enfocas. En una pantalla estrecha, un aviso
          único lo explica, y no vuelve una vez lo descartas.
        </p>
        <p>
          El nuevo diseño entra deslizándose desde el lado hacia el que has
          deslizado. Tu elección se recuerda para la próxima vez.
        </p>
        <p>
          <b>El reloj activo recolorea toda la página.</b> Cada diseño trae su
          propia paleta, así que el fondo y los acentos cambian con él, y todos
          funcionan tanto en oscuro como en claro. Cambia entre oscuro y claro
          desde el cajón, en <b>Apariencia</b>; sigue la preferencia de tu sistema
          hasta que le digas otra cosa.
        </p>
      </>
    ),
  },
  {
    heading: "Etiquetas de entorno",
    body: (
      <>
        <p>
          Seis etiquetas —<b>Música</b>, <b>Pódcast</b>, <b>TV</b>,{" "}
          <b>Silencio</b>, <b>Ruido</b>, <b>Auriculares</b>— que describen las
          condiciones en las que estás trabajando. Son un registro, no un control:
          nada en la app cambia cuando pulsas una.
        </p>
        <ul>
          <li>
            <b>Silencio desactiva las otras cuatro etiquetas de sonido</b>, porque
            no puedes estar en silencio y tener la TV puesta.
          </li>
          <li>
            <b>Auriculares es independiente</b>: es un equipo que llevas puesto,
            no un entorno sonoro, así que puede estar activo junto a cualquiera de
            las demás.
          </li>
        </ul>
        <p>
          Lo que esté encendido cuando termina una sesión se guarda con esa
          sesión y —si usas Todoist y dejas activado el ajuste del comentario de
          tiempo— se menciona en el comentario que publica GLU:{" "}
          <i>«[25m] Has dedicado 25 minutos a esto — con música, con auriculares»</i>.
        </p>
        <p>
          <b>Silencio no es un botón de silenciar.</b> Dice cómo trabajaste. El
          sonido de fin de sesión lo controla el volumen de tu dispositivo, y nada
          más.
        </p>
      </>
    ),
  },
  {
    heading: "Sesiones y «Nuevo día»",
    body: (
      <>
        <p>
          Cada sesión completada añade un punto bajo el temporizador, con un
          contador al lado. Pasados doce puntos, el resto se resume como{" "}
          <code>+N</code> para que un día heroico no descoloque la disposición. El
          interruptor <b>Mostrar sesiones</b> que hay junto a ellos decide si el
          contador aparece también en el propio reloj.
        </p>
        <p>
          <b>«Nuevo día» pone el contador a cero</b>, y te pide confirmación
          antes. Es <b>manual</b>: GLU no cambia de día a medianoche, porque un día
          de concentración empieza cuando te sientas, no cuando cambia la fecha.
          Si trabajas pasada la medianoche sigue siendo la misma sentada hasta que
          digas lo contrario.
        </p>
        <p>
          El día que cierras se guarda en un archivo de <b>como máximo los
          últimos 90 días</b>; los más antiguos van desapareciendo
          automáticamente. Todo ello se guarda solo en este navegador: no hay
          copia en el servidor, ni cuenta, ni sincronización con otro
          dispositivo. Borrar los datos del sitio lo elimina por completo, y ese
          es el único botón de borrado que hace falta. La{" "}
          <LegalLink href="/privacy">Política de privacidad</LegalLink> detalla
          exactamente qué hay ahí dentro.
        </p>
      </>
    ),
  },
  {
    heading: "Avisos al final de una sesión",
    body: (
      <>
        <p>
          Cuando una sesión llega a cero con GLU abierto, suena un aviso —generado
          en el navegador, así que no se descarga nada—. Su volumen es el volumen
          de tu dispositivo.
        </p>
        <p>
          En <b>Ajustes → Avisos</b> eliges cuál, entre nueve:
        </p>
        <DataList
          items={[
            {
              term: "Sonido",
              detail:
                "Campanilla (el predeterminado), Campana, Madera, Ascenso, Reposo, Pulso, Digital, Cristal o Grave. Al tocar uno suena, así que eliges con el oído; tocar el que está sonando lo detiene.",
            },
            {
              term: "Cuánto tiempo suena",
              detail:
                "Una vez por defecto: el sonido se reproduce entero una sola vez. Elige 3, 5, 10 o 20 segundos y se repetirá hasta que pase ese tiempo; la última repetición siempre termina, así que puede sonar un momento más. Pulsar Iniciar, Pausar, Reanudar o Detener —o sus teclas— lo corta.",
            },
          ]}
        />
        <p>
          <b>Si la pestaña está en segundo plano, recibes además una
          notificación</b>{" "}
          («GLU — se acabó el tiempo»), que enfoca la app al pulsarla. Una página
          visible nunca recibe notificación: ya la estás mirando. El sonido
          funciona en ambos casos.
        </p>
        <p>
          <b>Ajustes → Avisos</b> empieza con un interruptor para esto. Activarlo
          pide permiso a tu navegador, y desactivarlo detiene las notificaciones
          sin tocar el sonido. GLU también lo pide cuando pulsas Iniciar, como
          máximo tres veces; después deja de preguntar para siempre y el
          interruptor es la vía de entrada. Si tu navegador está bloqueando las
          notificaciones, el interruptor lo dirá y te indicará dónde cambiarlo.
        </p>
        <p>
          <b>Detener una sesión tú mismo es silencioso a propósito</b>, igual que
          una sesión que venció con la pestaña cerrada. Los avisos existen para
          interrumpirte cuando no estás mirando, no para felicitarte por pulsar
          Detener.
        </p>
        <p>
          En Chrome para Android la notificación la entrega un pequeño ayudante en
          segundo plano que existe solo para eso: no guarda nada, nunca toca la
          red y no cambia nada más en la forma en que GLU carga. En el iPad,
          Safari no ofrece notificaciones a una pestaña del navegador, así que
          allí GLU se queda solo con el sonido, que suele bastar con el
          dispositivo apoyado delante de ti y la pantalla encendida.
        </p>
      </>
    ),
  },
  {
    heading: "Mantener la pantalla encendida",
    body: (
      <>
        <p>
          Una tablet que se duerme a mitad de sesión esconde justo aquello para lo
          que la apoyaste. En <b>Ajustes → Pantalla</b> hay dos interruptores:
        </p>
        <DataList
          items={[
            {
              term: "Mantener encendida en el sitio web",
              detail:
                "Desactivado por defecto. Mantiene la pantalla encendida mientras GLU esté abierto, haya temporizador o no: el ajuste para un dispositivo que vive en tu escritorio mostrando el reloj.",
            },
            {
              term: "Mantener encendida mientras el temporizador está en marcha",
              detail:
                "Activado por defecto. Mantiene la pantalla encendida durante una sesión, y cinco minutos después de que se pause o termine, para que no te encuentres una pantalla negra cuando suene el aviso.",
            },
          ]}
        />
        <p>
          Algunos navegadores solo lo permiten mientras la pestaña está visible,
          así que cambiar de pestaña lo libera y volver lo recupera. No se informa
          de nada a ninguna parte: es una petición a tu propio dispositivo.
        </p>
      </>
    ),
  },
  {
    heading: "El último minuto",
    body: (
      <>
        <p>
          Por debajo de los <b>60 segundos restantes</b>, el color del reloj
          inunda todo el fondo y lo demás se retira. Está pensado para verse desde
          el otro lado de la habitación y con el rabillo del ojo: el momento en el
          que empiezas a terminar tu frase en lugar de empezar otra. Se mantiene
          hasta el 00:00 como pantalla de fin, y desaparece en cuanto detienes o
          pausas.
        </p>
        <p>
          <b>Toca en cualquier sitio —incluido el reloj— y todo vuelve</b>, para
          el resto de esa sesión: los botones, las etiquetas, la lista de tareas.
          No volverá a taparlos unos segundos después. La siguiente sesión que
          inicies tiene su propio último minuto.
        </p>
        <p>
          En una pantalla estrecha nada de esto se aplica. Allí el reloj ya llena
          la primera pantalla y todo lo demás queda debajo, así que no hay nada
          que esconder: bajas hasta los controles exactamente como harías siempre.
        </p>
      </>
    ),
  },
  {
    heading: "Todoist (opcional)",
    body: (
      <>
        <p>
          GLU funciona perfectamente por sí solo. Conectar{" "}
          <LegalLink href="https://todoist.com">Todoist</LegalLink> añade una
          lista de tareas junto al temporizador, para que lo que estás
          cronometrando tenga nombre.
        </p>
        <p>
          <b>Iniciar sesión:</b> el botón <i>Iniciar sesión con Todoist</i> en la
          zona superior derecha, o <b>Ajustes → Todoist</b>. Apruebas la conexión
          en la propia pantalla de Todoist. Puedes cerrar sesión desde esa misma
          fila de ajustes, o revocar GLU desde dentro de Todoist: cualquiera de
          las dos basta, y revocar funciona sin tocar esta app en absoluto.
        </p>
        <DataList
          items={[
            {
              term: "Elegir qué se muestra",
              detail:
                "El icono de herramientas abre el selector de origen: un filtro, una etiqueta o un proyecto. Un proyecto agrupa sus tareas bajo un encabezado por cada sección, en orden, con las tareas sin sección primero. Un filtro o una etiqueta agrupan también cada tarea por proyecto —«Trabajo / Hoy», o solo «Trabajo» cuando la tarea no tiene sección—, ya que uno de sus resultados podría pertenecer a cualquier proyecto, y se ordenan como Todoist ordena uno por defecto: primero la prioridad, luego la fecha, luego la fecha límite y luego el lugar que ocupa la tarea en tus proyectos, salvo que un filtro construido alrededor de fechas aquí se sigue ordenando por prioridad primero. Las listas largas muestran las primeras 200 tareas y lo indican.",
            },
            {
              term: "Acortar una sección larga",
              detail:
                "Ajustes → Tareas limita cuántas tareas muestra cada sección: 10, 20, 50, 100 o todas, que es lo predeterminado. Lo que pase del límite queda tras una línea «+N más» que puedes tocar para ver el resto de esa sección; la siguiente visita vuelve a empezar con el límite puesto.",
            },
            {
              term: "Actualizar la lista",
              detail:
                "La lista se vuelve a cargar cuando eliges un origen y cada vez que vuelves a la pestaña; nunca consulta en segundo plano. Para pedirlo tú, tira de la lista hacia abajo con el dedo hasta que el icono de recarga se rellene y suelta: gira hasta que llega la lista nueva y luego se retira. El icono de recarga de la esquina superior derecha hace exactamente lo mismo.",
            },
            {
              term: "Completar una tarea",
              detail:
                "Toca el círculo de prioridad a la izquierda de una tarjeta, el mismo gesto que en Todoist. Se completa de inmediato y desaparece de la lista, y una barra en la parte inferior te da unos diez segundos para deshacerlo.",
            },
            {
              term: "Enfocar una tarea",
              detail:
                "El botón de enfoque fija una tarea encima de la lista. Esa es la tarea a la que se publica un comentario de tiempo, y su tarjeta lleva el total acumulado del tiempo que GLU ha registrado en ella.",
            },
            {
              term: "Detalles de la tarea",
              detail:
                "Al tocar una tarjeta se abren su descripción y sus comentarios —imágenes incluidas— como panel en tablet y a pantalla completa en una pantalla estrecha. Es de solo lectura; nada de lo que hay ahí cambia tu tarea.",
            },
          ]}
        />
        <p>
          <b>Comentarios de tiempo.</b> Cuando una sesión termina con una tarea
          enfocada, GLU le publica un comentario:{" "}
          <code>[25m] Has dedicado 25 minutos a esto</code>. Espera un par de
          segundos antes de enviarlo —la barra de deshacer puede cancelarlo del
          todo en esa ventana— y, durante unos segundos después de publicarse,
          deshacer vuelve a borrarlo. Las sesiones más cortas que tu mínimo no
          reciben ninguno; ese mínimo es un minuto salvo que lo cambies en{" "}
          <b>Ajustes → Comentarios de tiempo</b>, donde <b>Decir cómo trabajaste</b>{" "}
          decide además si tus etiquetas de entorno se mencionan en la frase.
          Ambos ajustes te muestran el comentario exacto que obtendrás.
        </p>
        <p>
          GLU solo escribe esas dos cosas —un comentario de tiempo, y completar o
          reabrir una tarea— y solo cuando se lo pides. No puede publicar texto
          arbitrario: la frase la compone el servidor de GLU a partir de los
          números y las etiquetas, nunca la escribe la página. Tu conexión con
          Todoist se guarda en una cookie cifrada que tu navegador no puede leer y
          que el servidor de GLU no almacena; todo el tráfico hacia Todoist pasa
          por ese servidor, así que el token de tu cuenta nunca llega a la página.
          La <LegalLink href="/privacy">Política de privacidad</LegalLink> tiene el
          resto.
        </p>
      </>
    ),
  },
  {
    heading: "Dos disposiciones",
    body: (
      <>
        <p>
          <b>En una tablet</b>, todo está en una pantalla y la página no se
          desplaza: el temporizador ocupa la mitad izquierda, Todoist la parte
          superior derecha y las etiquetas de entorno la inferior derecha.
        </p>
        <p>
          <b>En una pantalla estrecha</b> —un móvil, o media tablet— el reloj
          ocupa toda la primera pantalla y el resto se apila debajo, así que la
          página se desplaza. El reloj es lo que miras de reojo; se lleva el
          espacio.
        </p>
      </>
    ),
  },
  {
    heading: "Dónde está cada cosa",
    body: (
      <>
        <p>
          La <b>flecha de la esquina superior derecha</b> es la única pieza
          permanente de la interfaz. Abre el cajón, que contiene:
        </p>
        <DataList
          items={[
            { term: "GitHub", detail: "El código fuente. GLU es de código abierto." },
            { term: "Apariencia", detail: "Oscuro o claro, recordado entre visitas." },
            { term: "Docs", detail: "Esta página." },
            {
              term: "Ajustes",
              detail:
                "Todoist (iniciar o cerrar sesión), Tareas (cuántos elementos muestra una sección), Pantalla (los dos interruptores para no dormirse) y Comentarios de tiempo (qué se publica en Todoist, y cuándo).",
            },
          ]}
        />
        <p>
          Debajo de todo eso, enlaces a la{" "}
          <LegalLink href="/privacy">Política de privacidad</LegalLink> y a los{" "}
          <LegalLink href="/terms">Términos del servicio</LegalLink>.
        </p>
      </>
    ),
  },
  {
    heading: "Límites, con franqueza",
    body: (
      <ul>
        <li>
          <b>Sin sincronización.</b> Tu historial vive en un navegador de un
          dispositivo. Otro navegador, otro dispositivo o una ventana privada son
          un GLU distinto y vacío.
        </li>
        <li>
          <b>Sin modo sin conexión.</b> Instalado o no, necesita conexión para
          arrancar.
        </li>
        <li>
          <b>Noventa días.</b> El archivo guarda como mucho eso, y borrar los
          datos del sitio lo borra entero. Trata GLU como una forma de ver el
          trabajo de hoy, no como un sistema de registro: los{" "}
          <LegalLink href="/terms">Términos del servicio</LegalLink> dicen lo mismo
          con palabras más formales.
        </li>
        <li>
          <b>Un servidor pequeño, protegido.</b> La conexión con Todoist pasa por
          un proxy con límite de peticiones. El uso normal no lo notará nunca;
          machacarlo dará lugar a rechazos breves y temporales.
        </li>
        <li>
          <b>«Nuevo día» no se puede deshacer.</b> Por eso pregunta antes.
        </li>
      </ul>
    ),
  },
  {
    heading: "Privacidad y términos",
    body: (
      <p>
        La <LegalLink href="/privacy">Política de privacidad</LegalLink> expone
        exactamente qué maneja GLU, qué se queda en tu dispositivo y qué escribe
        en Todoist. Los{" "}
        <LegalLink href="/terms">Términos del servicio</LegalLink> cubren el uso de
        la app alojada. Ambos están enlazados al final de esta página y desde el
        cajón.
      </p>
    ),
  },
];

/**
 * El manual, en español. Sin `notice`: el manual describe la app en lugar de
 * obligar a nadie, así que una traducción del manual es sencillamente el manual.
 */
const content: DocumentContent = { updated, title, intro, sections };

export default content;
