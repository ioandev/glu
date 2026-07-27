import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "./en";

/**
 * La Política de privacidad en español (ADR 44) — traducción del texto inglés,
 * que es el que rige. Si una de sus afirmaciones deja de ser cierta, se arregla
 * el código, o este archivo junto con su fecha, nunca lo uno sin lo otro.
 */
const UPDATED = "25 de julio de 2026";

const sections: LegalSection[] = [
  {
    heading: "1. La versión corta",
    body: (
      <ul>
        <li>
          GLU no tiene cuentas, ni base de datos, ni analítica. No hay ningún
          registro tuyo en el servidor.
        </li>
        <li>
          Tu historial de concentración —sesiones, duraciones, etiquetas de
          entorno— se guarda en tu propio navegador y nunca se sube.
        </li>
        <li>
          Todoist es opcional. Si lo conectas, tus tokens viven cifrados en una
          cookie que solo el servidor puede abrir, y el servidor no guarda copia
          alguna.
        </li>
        <li>
          Sin cookies publicitarias, sin rastreadores de terceros, sin necesidad
          de banner de consentimiento.
        </li>
      </ul>
    ),
  },
  {
    heading: "2. Quién es el responsable",
    body: (
      <p>
        GLU es un proyecto personal y no comercial gestionado por Ioan Biticu,
        servido en <code>ioan.dev/glu</code>. Para cualquier consulta o solicitud
        sobre privacidad, escribe a{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "3. Qué se guarda en tu dispositivo",
    body: (
      <>
        <p>
          GLU mantiene su estado en el <b>almacenamiento local</b> de tu
          navegador, bajo una única clave versionada. Nunca se sube, y no hay
          ningún sitio al que subirlo. Contiene:
        </p>
        <DataList
          items={[
            {
              term: "Estado del temporizador",
              detail:
                "El temporizador en marcha o en pausa, su duración y la duración predefinida que elegiste por última vez, para que una recarga o cerrar la tapa no te haga perder la sesión.",
            },
            {
              term: "Historial de sesiones",
              detail:
                "Cada sesión completada: cuándo terminó, cuánto duró y qué etiquetas de entorno estaban activas. El día actual, más un archivo de como máximo los últimos 90 días.",
            },
            {
              term: "Preferencias",
              detail:
                "Diseño de reloj, estilo de la interfaz, esquema de color y los interruptores para mantener la pantalla encendida.",
            },
            {
              term: "Selecciones de Todoist",
              detail:
                "Si usas Todoist: la lista de tareas que elegiste, la tarea que enfocaste y cualquier comentario de seguimiento de tiempo pendiente de enviar.",
            },
          ]}
        />
        <p>
          Borrar los datos del sitio de <code>ioan.dev</code> en tu navegador
          elimina todo eso, de forma permanente y completa. «Nuevo día» en la app
          traslada el recuento visible al archivo; el archivo en sí está limitado
          a 90 días y descarta el día más antiguo automáticamente.
        </p>
      </>
    ),
  },
  {
    heading: "4. Cookies",
    body: (
      <>
        <p>
          GLU no coloca cookies publicitarias, analíticas ni entre sitios. Las
          únicas cookies que puede colocar son estrictamente necesarias y solo
          existen si conectas Todoist:
        </p>
        <DataList
          items={[
            {
              term: "glu_todoist",
              detail:
                "Tus tokens de Todoist cifrados (sellados). httpOnly, para que los scripts de la página no puedan leerla; Secure y SameSite=Lax en producción; limitada a /glu. Se elimina cuando cierras sesión.",
            },
            {
              term: "glu_oauth_state",
              detail:
                "Un valor antifalsificación de vida corta usado durante el inicio de sesión, válido diez minutos y descartado justo después.",
            },
          ]}
        />
        <p>
          Como ambas son estrictamente necesarias para una función que has
          iniciado deliberadamente, no hay banner de consentimiento. Un banner que
          pide permiso para lo que acabas de pulsar es teatro, y enseña a la gente
          a descartar los que sí importan.
        </p>
        <p>
          Tu preferencia de esquema de color también se recuerda en el
          almacenamiento del navegador. Eso es un ajuste, no rastreo.
        </p>
      </>
    ),
  },
  {
    heading: "5. Todoist",
    body: (
      <>
        <p>
          Conectar Todoist es totalmente opcional; todo lo demás en GLU funciona
          sin ello. Si lo conectas:
        </p>
        <ul>
          <li>
            Autorizas a GLU a través de la propia pantalla de OAuth de Todoist.
            GLU solicita acceso de lectura y escritura, porque muestra tus tareas
            y —solo cuando tú lo haces— las completa y añade un comentario de
            tiempo.
          </li>
          <li>
            Los tokens resultantes se <b>sellan (cifran) en una cookie
            httpOnly</b>. El navegador guarda un bloque opaco que no puede
            descifrar; el servidor puede abrirlo, pero no almacena nada. No hay
            base de datos de tokens porque no hay base de datos.
          </li>
          <li>
            <b>Todo el tráfico de Todoist pasa por el propio servidor de GLU</b>,
            así que tu token nunca llega a la página y tu navegador nunca contacta
            con Todoist directamente. Las imágenes de las tareas y los archivos
            adjuntos se obtienen de la misma forma, y por eso tu navegador tampoco
            habla nunca con la CDN de Todoist.
          </li>
        </ul>
        <p>
          Lo que GLU <b>escribe</b> en tu cuenta, y solo cuando se lo pides:
          completar o descompletar una tarea, y publicar un único comentario de
          seguimiento de tiempo con la forma{" "}
          <code>[25m] Has dedicado 25 minutos a esto</code>. Esa frase la compone
          el servidor, no la página: GLU no puede publicar texto arbitrario en tus
          tareas.
        </p>
        <p>
          Puedes desconectarlo en cualquier momento:{" "}
          <b>Ajustes → Todoist → Cerrar sesión</b> borra la cookie, y revocar GLU
          en los ajustes de tu cuenta de Todoist detiene el acceso de inmediato y
          con independencia de lo que yo haga.
        </p>
      </>
    ),
  },
  {
    heading: "6. Qué ve el servidor",
    body: (
      <>
        <p>
          El servidor es un proxy sin estado. No tiene base de datos, ni almacén
          de sesiones, ni registros de usuario. Solo ve lo que ve cualquier
          servidor web al atender una petición:
        </p>
        <ul>
          <li>
            <b>Contadores para limitar peticiones.</b> Para mantener disponible un
            contenedor pequeño, las peticiones se cuentan por cliente. La clave
            del contador se deriva de tu dirección IP (las IPv6 se agrupan por
            prefijo de red, nunca por la dirección individual), se guarda{" "}
            <b>solo en memoria</b>, nunca se escribe en disco y se pierde por
            completo cuando el proceso se reinicia. La línea de registro de una
            petición rechazada no contiene ninguna dirección, a propósito.
          </li>
          <li>
            <b>Registros operativos ordinarios</b>: errores y diagnósticos
            necesarios para mantener el sitio en marcha. No hay canal de analítica,
            ni seguimiento de eventos, ni perfilado.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. Terceros",
    body: (
      <>
        <ul>
          <li>
            <b>Todoist</b>: solo si lo conectas. Tu uso de Todoist se rige por{" "}
            <LegalLink href="https://todoist.com/privacy">
              su política de privacidad
            </LegalLink>
            .
          </li>
          <li>
            <b>Infraestructura de alojamiento</b>: los servidores en los que se
            ejecuta el sitio, que procesan las peticiones en mi nombre.
          </li>
        </ul>
        <p>
          Esa es la lista completa. GLU no carga fuentes, scripts ni imágenes
          desde el servidor de nadie más: su política de seguridad de contenido
          solo permite su propio origen, así que un rastreador de terceros no
          podría ejecutarse ni aunque se añadiera por accidente.
        </p>
      </>
    ),
  },
  {
    heading: "8. Permisos que pide la app",
    body: (
      <>
        <p>
          Cada uno de ellos es un permiso del navegador, gestionado enteramente en
          tu dispositivo. No se informa de nada de ello en ninguna parte, y
          rechazar cualquiera de ellos deja el temporizador plenamente utilizable.
        </p>
        <DataList
          items={[
            {
              term: "Notificaciones",
              detail:
                "Para que una sesión terminada pueda avisarte cuando GLU está en una pestaña en segundo plano. Se pide una vez, en tu primer Iniciar; si lo rechazas, tu navegador lo recuerda y no se vuelve a preguntar.",
            },
            {
              term: "Bloqueo de apagado de pantalla",
              detail:
                "Para que la tablet no se duerma a mitad de sesión. Se controla con los dos interruptores de Ajustes → Pantalla.",
            },
            {
              term: "Sonido",
              detail:
                "Todos los sonidos de fin de sesión se generan en el navegador. No se descarga ningún archivo de audio y no se graba nada: GLU nunca solicita acceso al micrófono ni a la cámara.",
            },
          ]}
        />
      </>
    ),
  },
  {
    heading: "9. Conservación",
    body: (
      <p>
        En tu dispositivo: mientras lo conserves; el archivo de sesiones se limita
        solo a 90 días, y borrar los datos del sitio lo elimina todo de una vez. En
        el servidor: no se conserva nada, porque no se almacena nada. La cookie de
        Todoist vive en tu navegador hasta que cierras sesión o caduca; los
        contadores de límite de peticiones desaparecen al reiniciar; los registros
        operativos se guardan brevemente por seguridad y depuración.
      </p>
    ),
  },
  {
    heading: "10. Tus derechos",
    body: (
      <p>
        Según dónde vivas, puedes tener derecho a acceder, corregir, exportar o
        suprimir los datos personales que se tengan sobre ti, y a oponerte a su
        tratamiento. GLU está construido de forma que casi no hay nada contra lo
        que ejercerlos: sin cuenta, sin perfil en el servidor y con un historial
        local que solo tú puedes leer. Para cualquier cosa que creas que sí tengo,
        escribe a <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>{" "}
        y me ocuparé de ello.
      </p>
    ),
  },
  {
    heading: "11. Menores",
    body: (
      <p>
        GLU no está dirigido a menores y no recojo a sabiendas datos de nadie
        menor de 16 años.
      </p>
    ),
  },
  {
    heading: "12. Cambios",
    body: (
      <p>
        Si algún día GLU empieza a tratar los datos de otra manera, esta página
        cambiará con ello y la fecha de «Última actualización» de arriba se
        moverá. El proyecto es de código abierto, así que el cambio queda visible
        en su historial además de aquí.
      </p>
    ),
  },
];

/** La Política de privacidad en español. El texto inglés es el que rige. */
const content: DocumentContent = {
  updated: UPDATED,
  title: "Política de privacidad",
  intro: (
    <>
      GLU es un pomodoro y registro de concentración que mantiene tus datos en tu
      propio dispositivo. Esta página explica exactamente qué maneja, adónde va y
      qué no hace nunca. Se aplica junto con los{" "}
      <LegalLink href="/terms">Términos del servicio</LegalLink>.
    </>
  ),
  sections,
};

export default content;
