import { LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "../privacy/en";

/** Los Términos en español (ADR 44) — traducción; el texto inglés es el que rige. */
const UPDATED = "25 de julio de 2026";

const sections: LegalSection[] = [
  {
    heading: "1. Quién gestiona GLU",
    body: (
      <p>
        GLU (el «Servicio») es un proyecto personal y no comercial gestionado por
        Ioan Biticu («yo», «mí») en <code>ioan.dev/glu</code>. Es un pomodoro y
        registro de concentración pensado ante todo para tablet, ofrecido de forma
        gratuita y desarrollado en abierto. Puedes escribirme a{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "2. Aceptación",
    body: (
      <p>
        Al usar GLU aceptas estos Términos. Si no estás de acuerdo, por favor no
        uses el Servicio. Se aplican junto con la{" "}
        <LegalLink href="/privacy">Política de privacidad</LegalLink>, que describe
        qué datos se manejan y dónde residen.
      </p>
    ),
  },
  {
    heading: "3. Qué es el Servicio",
    body: (
      <>
        <p>
          Un temporizador, un registro de las sesiones de concentración que
          completas y una integración opcional con Todoist que muestra tus tareas,
          te permite completarlas y añade un comentario de seguimiento de tiempo
          cuando terminas una sesión sobre una tarea que has enfocado.
        </p>
        <p>
          Es un aparato personal, no un producto con servicio de soporte. Las
          funciones pueden cambiar, y el Servicio puede interrumpirse o
          descontinuarse en cualquier momento sin previo aviso.
        </p>
      </>
    ),
  },
  {
    heading: "4. Tus datos están en tu dispositivo",
    body: (
      <>
        <p>
          Tu historial de sesiones vive en el almacenamiento local de tu
          navegador: no hay cuenta, ni copia en el servidor, ni copia de
          seguridad. Es una decisión de diseño deliberada, y tiene una
          consecuencia que deberías leer como una condición y no como una nota al
          pie:
        </p>
        <ul>
          <li>
            Borrar los datos del sitio en tu navegador, usar la navegación privada
            o cambiar de dispositivo o de navegador significa que el historial se
            ha perdido o no está. No puede recuperarlo ni yo ni nadie.
          </li>
          <li>
            El archivo guarda como máximo los últimos 90 días; los días más
            antiguos se descartan automáticamente.
          </li>
        </ul>
        <p>
          <b>No dependas de GLU como sistema de registro</b> para horas
          facturables ni para cualquier otra cosa que importe después.
        </p>
      </>
    ),
  },
  {
    heading: "5. Tu cuenta de Todoist",
    body: (
      <>
        <p>
          Si conectas Todoist, GLU actúa siguiendo tus instrucciones y con tu
          autorización. Eres responsable de la cuenta que conectas y de revisar lo
          que GLU hace en ella; en concreto: completar o descompletar las tareas
          que tocas y publicar un único comentario de seguimiento de tiempo cuando
          termina una sesión enfocada.
        </p>
        <p>
          Conecta solo una cuenta que controles. Puedes revocar el acceso en
          cualquier momento desde Ajustes → Todoist → Cerrar sesión, o desde los
          propios ajustes de cuenta de Todoist. Todoist es un servicio
          independiente regido por{" "}
          <LegalLink href="https://todoist.com/terms">sus propios términos</LegalLink>
          ; no soy responsable de él, de su disponibilidad ni de los cambios en su
          API.
        </p>
      </>
    ),
  },
  {
    heading: "6. Uso aceptable",
    body: (
      <>
        <p>Te comprometes a no:</p>
        <ul>
          <li>
            inundar, extraer datos ni automatizar peticiones contra el Servicio, ni
            eludir los límites de peticiones que aplica: existen para que un
            servidor pequeño siga disponible para todo el mundo que lo usa;
          </li>
          <li>
            sondear, escanear ni intentar burlar su seguridad, ni intentar acceder
            a datos que pertenezcan a otra persona;
          </li>
          <li>
            conectar una cuenta de Todoist que no controles, ni usar el Servicio
            para interferir en la cuenta de otra persona;
          </li>
          <li>usar el Servicio para nada ilícito.</li>
        </ul>
        <p>
          Las peticiones que superan el límite se rechazan automáticamente, y el
          tráfico abusivo puede bloquearse sin previo aviso.
        </p>
      </>
    ),
  },
  {
    heading: "7. Disponibilidad",
    body: (
      <p>
        GLU funciona sobre una infraestructura personal modesta. No hay compromiso
        de tiempo de actividad, ni nivel de servicio, ni garantía de que una sesión
        en curso sobreviva a un reinicio o a un despliegue, aunque el estado de tu
        temporizador se guarda localmente y normalmente sí sobrevive.
      </p>
    ),
  },
  {
    heading: "8. Propiedad intelectual y licencias",
    body: (
      <p>
        El código fuente de GLU está publicado en{" "}
        <LegalLink href="https://github.com/ioandev/glu">GitHub</LegalLink> bajo la
        Licencia Apache 2.0, y las licencias de los componentes de terceros de los
        que depende están listadas en el repositorio. Esos términos de licencia
        rigen el <i>código</i>; estos Términos rigen tu uso del{" "}
        <i>servicio alojado</i>. El nombre GLU, su contenido escrito y su diseño
        son míos; el nombre y el logotipo de Todoist pertenecen a Doist y se usan
        para identificar la integración.
      </p>
    ),
  },
  {
    heading: "9. Sin garantía",
    body: (
      <p>
        El Servicio se proporciona «tal cual» y «según disponibilidad», sin
        garantías de ningún tipo, expresas o implícitas, incluida la de idoneidad
        para un fin concreto. No garantizo que vaya a ser exacto, ininterrumpido,
        puntual ni libre de errores, incluido que un aviso de fin de sesión llegue
        a tiempo, lo cual depende de tu navegador y de tu sistema operativo.
      </p>
    ),
  },
  {
    heading: "10. Limitación de responsabilidad",
    body: (
      <p>
        En la máxima medida permitida por la ley, no soy responsable de ninguna
        pérdida indirecta, incidental o consecuente derivada de tu uso del
        Servicio, ni de la pérdida del historial de sesiones, los avisos no
        recibidos o los cambios realizados en tu cuenta de Todoist a través del
        Servicio. Nada de lo aquí dicho excluye la responsabilidad que no pueda
        excluirse legalmente.
      </p>
    ),
  },
  {
    heading: "11. Cambios en estos Términos",
    body: (
      <p>
        Estos Términos pueden cambiar; la fecha de «Última actualización» de
        arriba refleja la versión vigente, y seguir usando el Servicio tras un
        cambio significa que lo aceptas.
      </p>
    ),
  },
  {
    heading: "12. Ley aplicable",
    body: (
      <p>
        Estos Términos se rigen por las leyes de Inglaterra y Gales. Nada de lo
        aquí dicho limita los derechos que te correspondan por la legislación
        imperativa de consumo o de protección de datos del lugar donde vives.
      </p>
    ),
  },
  {
    heading: "13. Contacto",
    body: (
      <p>
        ¿Tienes preguntas sobre estos Términos? Escribe a{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
];

/** Los Términos en español. El texto inglés es el que rige. */
const content: DocumentContent = {
  updated: UPDATED,
  title: "Términos del servicio",
  intro: (
    <>
      GLU es un temporizador de concentración personal y gratuito, ofrecido tal
      cual. Tus datos se quedan en tu dispositivo y tu cuenta de Todoist sigue
      siendo tuya. La{" "}
      <LegalLink href="/privacy">Política de privacidad</LegalLink> cubre la parte
      de los datos.
    </>
  ),
  sections,
};

export default content;
