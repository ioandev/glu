import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "./types";
import { CLOCK_COUNT } from "@/clocks/registry";

/**
 * The GLU manual in French — a translation of `en.tsx`, which is the document
 * it is made from (ADR 44). Same sections, same order, same claims: if the
 * English manual gains a paragraph or changes a default, this file changes
 * with it, `updated` included.
 *
 * UI labels are quoted with the wording `src/locales/fr.ts` actually paints —
 * a manual that names a button the app does not have is worse than no manual.
 * The time comment is composed by the server and is always English, so it is
 * quoted verbatim.
 *
 * No `notice`: the manual describes the app rather than binding anyone, so a
 * translated one is simply the manual.
 */
const updated = "26 juillet 2026";

const title = "Comment fonctionne GLU";

const intro = (
  <>
    GLU est un minuteur de concentration conçu pour une tablette posée à côté de vous
    pendant que vous travaillez. Cette page contient tout ce qu’il sait faire — le
    minuteur, la galerie d’horloges, les pastilles d’environnement, le relevé des
    sessions et la connexion Todoist facultative. C’est volontairement une seule
    page&#8239;: utilisez la recherche dans la page de votre navigateur pour vous y
    déplacer.
  </>
);

const sections: LegalSection[] = [
  {
    heading: "Ce qu’est GLU",
    body: (
      <>
        <p>
          Un minuteur pomodoro et un suivi de concentration. Vous choisissez une durée,
          vous appuyez sur Démarrer et vous travaillez jusqu’à ce que l’horloge atteigne
          zéro. GLU enregistre la session pour que vous puissiez voir combien vous en
          avez faites aujourd’hui — et, si vous connectez Todoist, il peut noter le temps
          sur la tâche sur laquelle vous travailliez.
        </p>
        <p>
          Il n’y a <b>ni compte ni inscription</b>. Tout ce que GLU sait vit dans le
          navigateur où vous lisez ceci. C’est un seul écran&#8239;: aucun menu où se
          perdre, aucun tableau de bord, rien à configurer avant que ce soit utile.
        </p>
        <p>
          La toute première fois que vous ouvrez GLU, il affiche une courte présentation
          à la place du minuteur, avec un bouton qui vous fait entrer. Vous ne la voyez{" "}
          <b>qu’une fois par navigateur</b> — ensuite GLU s’ouvre directement sur
          l’horloge. Elle reste lisible sur{" "}
          <LegalLink href="/welcome">la page de bienvenue</LegalLink> si vous voulez la
          revoir un jour, ou l’envoyer à quelqu’un. Effacer les données de votre
          navigateur remet cela à zéro comme tout le reste, et GLU vous accueillera de
          nouveau comme un nouveau venu.
        </p>
      </>
    ),
  },
  {
    heading: "L’installer comme une application",
    body: (
      <p>
        GLU peut être installé sur un écran d’accueil ou sur un bureau —
        «&#8239;Installer l’application&#8239;» dans le menu du navigateur sur Android,
        «&#8239;Sur l’écran d’accueil&#8239;» sur un iPad, la commande d’installation
        dans la barre d’adresse sur un navigateur de bureau — et il s’ouvre alors sans
        l’habillage du navigateur, ce qui est la bonne allure pour un minuteur posé sur
        un support. Sur Android, choisissez la formulation <i>Installer</i> quand les
        deux apparaissent&#8239;: le simple raccourci garde une barre de navigateur en
        haut. <b>Ce n’est pas une application hors ligne</b>&#8239;: elle a besoin d’une
        connexion à chaque démarrage. Rien d’autre ne change&#8239;; c’est la même
        application, avec les mêmes données, dans une autre fenêtre.
      </p>
    ),
  },
  {
    heading: "Le minuteur",
    body: (
      <>
        <p>
          La rangée au-dessus de l’horloge contient les durées prédéfinies — <b>5, 10,
          15, 20, 30, 45 et 60 minutes</b>. Vingt est sélectionnée à votre arrivée.
          Appuyer sur une durée règle le minuteur, et appuyer dessus <i>pendant</i> une
          session recible cette session au lieu d’attendre qu’elle se termine.
        </p>
        <p>
          Sous l’horloge, deux boutons — les plus grandes cibles de l’écran, parce que ce
          sont ceux que vous atteignez sans regarder. Le premier nomme toujours ce qu’il
          s’apprête à faire&#8239;: <b>Démarrer</b> quand rien ne tourne, <b>Pause</b>{" "}
          pendant que ça tourne, <b>Reprendre</b> une fois que vous avez mis en pause. Le
          second est <b>Arrêter</b>. En dessous, <b>+1 / +5 / −1 / −5</b>, qui veulent
          dire l’une de deux choses selon ce que fait le minuteur.
        </p>
        <p>
          <i>Pendant</i> une session, ils ajustent la session en cours, et elle
          seule — arrêter vous ramène à la durée que vous aviez choisie. Quand rien ne
          tourne, ce qui inclut rester à 00:00 après une session terminée, ils règlent la
          durée de la <b>prochaine</b> session. Une durée qui n’est pas l’une des sept
          prédéfinies apparaît dans la rangée comme un bouton supplémentaire à elle,
          sélectionné, et elle y reste au fil des démarrages, arrêts et redémarrages
          jusqu’à ce que vous appuyiez de nouveau sur une durée prédéfinie. Une minute est
          la plus courte session que GLU retiendra&#8239;; soustraire au-delà sur une
          horloge qui compte déjà termine simplement la session.
        </p>
        <DataList
          items={[
            {
              term: "Au repos",
              detail:
                "Rien ne tourne. L’horloge affiche la durée que vous avez sélectionnée, prête à démarrer.",
            },
            {
              term: "En cours",
              detail:
                "Le décompte est lancé. Les chiffres ne tressautent pas — ils gardent leur largeur.",
            },
            {
              term: "En pause",
              detail:
                "Arrêtée là où vous l’avez laissée. Appuyez sur Reprendre pour repartir à la même seconde.",
            },
            {
              term: "Terminée",
              detail:
                "Zéro, et visiblement différent du repos. Rien ne redémarre tout seul — la prochaine session est votre décision.",
            },
          ]}
        />
        <p>
          <b>
            Le minuteur survit à un rechargement, à un capot fermé et à un onglet passé en
            arrière-plan.
          </b>{" "}
          Il compte à partir de l’heure à laquelle il a démarré plutôt qu’à partir de
          battements qu’il devrait rester éveillé pour recevoir&#8239;: revenir à l’onglet
          montre donc le temps restant correct, et pas une horloge arrêtée en même temps
          que l’écran. Si une session a expiré pendant votre absence, vous la trouverez
          terminée et silencieuse — le son est pour le moment où cela arrive, pas pour des
          heures plus tard.
        </p>
      </>
    ),
  },
  {
    heading: "Raccourcis clavier",
    body: (
      <>
        <p>Si vous avez un clavier branché&#8239;:</p>
        <DataList
          items={[
            { term: "P", detail: "Mettre en pause, ou reprendre une session en pause." },
            { term: "S", detail: "Arrêter la session en cours." },
            {
              term: "N",
              detail:
                "Abandonner ce qui tourne et démarrer une nouvelle session à la durée sélectionnée.",
            },
            {
              term: "Ctrl + C",
              detail:
                "Arrête aussi — l’habitude empruntée au terminal. Si du texte est sélectionné, il est copié à la place, exactement comme vous vous y attendez.",
            },
          ]}
        />
        <p>
          Les raccourcis ne se déclenchent jamais pendant que vous tapez dans un champ de
          texte, et maintenir une touche enfoncée ne répète pas l’action. Arrêter nomme
          son raccourci dans une infobulle, et le premier bouton aussi dès qu’il y a une
          session à mettre en pause ou à reprendre&#8239;: il n’y a donc rien à mémoriser
          depuis cette page.
        </p>
      </>
    ),
  },
  {
    heading: "L’horloge est une galerie",
    body: (
      <>
        <p>
          Il y a <b>{CLOCK_COUNT} designs d’horloge</b>, et celui qui est à l’écran est un
          choix, pas un réglage par défaut qu’il faut subir. <b>Faites glisser l’horloge
          latéralement</b> pour les parcourir&#8239;; sur un écran large, il y a aussi des
          chevrons de part et d’autre de l’horloge, discrets tant que vous ne les survolez
          pas et ne les ciblez pas. Sur un écran étroit, une astuce le dit une seule fois,
          et ne revient pas une fois masquée.
        </p>
        <p>
          Le nouveau design arrive depuis la direction de votre glissement. Votre choix
          est retenu pour la fois suivante.
        </p>
        <p>
          <b>L’horloge active recolore toute la page.</b> Chaque design apporte sa propre
          palette, donc le fond et les accents changent avec lui — et chacun d’eux
          fonctionne en sombre comme en clair. Passez du sombre au clair depuis le tiroir,
          sous <b>Apparence</b>&#8239;; cela suit le réglage de votre système jusqu’à ce
          que vous en décidiez autrement.
        </p>
      </>
    ),
  },
  {
    heading: "Les réglages d’environnement",
    body: (
      <>
        <p>
          Six pastilles — <b>Musique</b>, <b>Podcast</b>, <b>Télé</b>, <b>Silence</b>,{" "}
          <b>Bruit</b>, <b>Casque</b> — qui décrivent les conditions dans lesquelles vous
          travaillez. Ce sont un relevé, pas une commande&#8239;: rien dans l’application
          ne change quand vous en appuyez une.
        </p>
        <ul>
          <li>
            <b>Silence éteint les quatre autres pastilles sonores</b>, parce qu’on ne peut
            pas être dans le silence et avoir la télé allumée.
          </li>
          <li>
            <b>Casque est indépendante</b> — c’est un équipement sur votre tête, pas un
            environnement sonore, elle peut donc être active en même temps que n’importe
            laquelle des autres.
          </li>
        </ul>
        <p>
          Ce qui est allumé quand une session se termine est enregistré avec cette
          session — et, si vous utilisez Todoist et laissez actif le réglage des
          commentaires de temps, c’est nommé dans le commentaire que GLU
          publie&#8239;: <i>«&#8239;[25m] You spent 25 minutes on this — with music, on
          headphones&#8239;»</i>.
        </p>
        <p>
          <b>Silence n’est pas un bouton de sourdine.</b> Elle dit comment vous avez
          travaillé. Le son de fin de session est réglé par le volume de votre appareil,
          et par rien d’autre.
        </p>
      </>
    ),
  },
  {
    heading: "Les sessions et « Nouvelle journée »",
    body: (
      <>
        <p>
          Chaque session terminée ajoute un point sous le minuteur, avec un compte à côté.
          Au-delà de douze points, le reste est résumé par <code>+N</code> pour qu’une
          journée héroïque ne déforme pas la mise en page. L’interrupteur{" "}
          <b>Afficher les sessions</b> à côté d’eux décide si le compte apparaît aussi sur
          l’horloge elle-même.
        </p>
        <p>
          <b>«&#8239;Nouvelle journée&#8239;» remet le compte à zéro</b>, et vous demande
          d’abord de confirmer. C’est <b>manuel</b> — GLU ne bascule pas à minuit, parce
          qu’une journée de concentration commence quand vous vous asseyez, pas quand la
          date change. Travaillez après minuit et c’est toujours la même séance jusqu’à ce
          que vous en décidiez autrement.
        </p>
        <p>
          La journée que vous clôturez est conservée dans une archive d’<b>au plus 90
          jours</b>&#8239;; les plus anciennes disparaissent automatiquement. Tout cela
          est stocké dans ce navigateur uniquement — il n’y a pas de copie sur un serveur,
          pas de compte, pas de synchronisation vers un autre appareil. Effacer les
          données du site les supprime complètement, et c’est le seul bouton de
          suppression dont il y a besoin. La{" "}
          <LegalLink href="/privacy">Politique de confidentialité</LegalLink> énumère
          exactement ce qu’il y a là-dedans.
        </p>
      </>
    ),
  },
  {
    heading: "Les alertes à la fin d’une session",
    body: (
      <>
        <p>
          Quand une session atteint zéro alors que GLU est ouvert, il joue un
          son — généré dans le navigateur, donc rien n’est téléchargé. Son volume est
          celui de votre appareil.
        </p>
        <p>
          Sous <b>Paramètres → Alertes</b>, vous choisissez lequel, parmi neuf&#8239;:
        </p>
        <DataList
          items={[
            {
              term: "Son",
              detail:
                "Carillon (celui par défaut), Cloche, Bois, Montée, Repos, Pulsation, Numérique, Verre ou Grave. Appuyer sur l’un d’eux le joue, pour que vous choisissiez à l’oreille ; appuyer sur celui qui est en train de jouer l’arrête.",
            },
            {
              term: "Durée de lecture",
              detail:
                "Une fois par défaut — le son est joué une seule fois en entier. Choisissez 3, 5, 10 ou 20 secondes et il se répète jusqu’à ce que ce temps soit écoulé ; la dernière répétition va toujours à son terme, elle peut donc durer un instant de plus. Appuyer sur Démarrer, Pause, Reprendre ou Arrêter — ou sur leurs touches — l’interrompt.",
            },
          ]}
        />
        <p>
          <b>Si l’onglet est en arrière-plan, vous recevez aussi une notification</b>{" "}
          («&#8239;GLU — c’est l’heure&#8239;»), qui met l’application au premier plan
          quand vous cliquez dessus. Une page visible n’est jamais notifiée — vous la
          regardez déjà. Le son fonctionne dans les deux cas.
        </p>
        <p>
          <b>Paramètres → Alertes</b> commence par un interrupteur pour cela. L’activer
          demande la permission à votre navigateur, et le désactiver arrête les
          notifications sans toucher au son. GLU demande aussi quand vous appuyez sur
          Démarrer, trois fois au maximum — après quoi il cesse de demander pour de bon,
          et l’interrupteur devient la voie d’entrée. Si votre navigateur bloque les
          notifications, l’interrupteur le dira, et vous indiquera où le changer.
        </p>
        <p>
          <b>Arrêter une session vous-même est délibérément silencieux</b>, tout comme une
          session qui a expiré pendant que l’onglet était fermé. Les alertes existent pour
          vous interrompre quand vous ne regardez pas — pas pour vous féliciter d’avoir
          appuyé sur Arrêter.
        </p>
        <p>
          Sur Android Chrome, la notification est délivrée par un petit assistant en
          arrière-plan qui n’existe que pour cela — il ne stocke rien, ne touche jamais au
          réseau, et ne change rien d’autre à la façon dont GLU se charge. Sur iPad,
          Safari n’offre pas de notifications à un onglet de navigateur&#8239;: GLU s’y
          rabat donc sur le son seul — en général l’appareil est de toute façon posé
          devant vous, l’écran maintenu allumé.
        </p>
      </>
    ),
  },
  {
    heading: "Garder l’écran allumé",
    body: (
      <>
        <p>
          Une tablette qui s’endort en pleine session cache justement ce pour quoi vous
          l’avez posée là. Sous <b>Paramètres → Écran</b>, il y a deux
          interrupteurs&#8239;:
        </p>
        <DataList
          items={[
            {
              term: "Garder l’écran allumé sur le site",
              detail:
                "Désactivé par défaut. Garde l’écran allumé tant que GLU est ouvert, minuteur ou pas — le réglage pour un appareil qui vit sur votre bureau en affichant l’horloge.",
            },
            {
              term: "Le garder allumé quand le minuteur tourne",
              detail:
                "Activé par défaut. Garde l’écran allumé pendant une session, et pendant cinq minutes après une pause ou une fin, pour que vous ne regardiez pas un écran noir quand le son se déclenche.",
            },
          ]}
        />
        <p>
          Certains navigateurs ne l’autorisent que tant que l’onglet est visible&#8239;:
          passer ailleurs le relâche, et revenir le reprend. Rien n’est signalé nulle
          part — c’est une demande faite à votre propre appareil.
        </p>
      </>
    ),
  },
  {
    heading: "La dernière minute",
    body: (
      <>
        <p>
          Sous les <b>60 secondes restantes</b>, la couleur de l’horloge envahit tout le
          fond et le reste s’efface. C’est fait pour être visible de l’autre bout d’une
          pièce et du coin de l’œil — le moment où vous commencez à finir votre phrase
          plutôt qu’à en commencer une nouvelle. Cela tient jusqu’à 00:00 comme affichage
          de fin, et se lève dès l’instant où vous arrêtez ou mettez en pause.
        </p>
        <p>
          <b>Appuyez n’importe où — l’horloge comprise — et tout revient</b>, pour le
          reste de cette session&#8239;: les boutons, les pastilles, la liste des tâches.
          Cela ne reviendra pas les recouvrir quelques secondes plus tard. La prochaine
          session que vous démarrez a droit à sa propre dernière minute.
        </p>
        <p>
          Sur un écran étroit, rien de tout cela ne s’applique. Là, l’horloge remplit déjà
          le premier écran et tout le reste se place en dessous&#8239;: il n’y a rien à
          cacher — vous faites défiler jusqu’aux commandes exactement comme d’habitude.
        </p>
      </>
    ),
  },
  {
    heading: "Todoist (facultatif)",
    body: (
      <>
        <p>
          GLU fonctionne très bien tout seul. Connecter{" "}
          <LegalLink href="https://todoist.com">Todoist</LegalLink> ajoute une liste de
          tâches à côté du minuteur, pour que ce que vous chronométrez ait un nom.
        </p>
        <p>
          <b>Se connecter&#8239;:</b> le bouton <i>Se connecter avec Todoist</i> dans la
          zone en haut à droite, ou <b>Paramètres → Todoist</b>. Vous approuvez la
          connexion sur l’écran de Todoist lui-même. Déconnectez-vous depuis la même ligne
          de paramètres, ou révoquez GLU depuis Todoist — l’un ou l’autre suffit, et la
          révocation fonctionne sans toucher du tout à cette application.
        </p>
        <DataList
          items={[
            {
              term: "Choisir ce qui s’affiche",
              detail:
                "L’icône d’outils ouvre le sélecteur de source : un filtre, une étiquette ou un projet. Un projet regroupe ses tâches sous un en-tête par section, dans l’ordre, les tâches sans section en premier. Un filtre ou une étiquette regroupe aussi chaque tâche par projet — « Travail / Aujourd’hui », ou simplement « Travail » quand la tâche n’a pas de section — puisque l’un de ses résultats peut appartenir à n’importe quel projet, et l’ordre est celui que Todoist applique par défaut : la priorité d’abord, puis la date, puis l’échéance, puis la place de la tâche dans vos projets, à ceci près qu’un filtre construit autour de dates reste ici trié par priorité d’abord. Les longues listes affichent les 200 premières tâches et le disent.",
            },
            {
              term: "Raccourcir une longue section",
              detail:
                "Paramètres → Tâches limite le nombre de tâches qu’une section affiche — 10, 20, 50, 100, ou toutes, ce qui est le réglage par défaut. Ce qui dépasse la limite se cache derrière une ligne « +N de plus » sur laquelle appuyer pour voir le reste de cette section ; la visite suivante repart plafonnée.",
            },
            {
              term: "Actualiser la liste",
              detail:
                "La liste se recharge quand vous choisissez une source et chaque fois que vous revenez à l’onglet — elle n’interroge jamais en arrière-plan. Pour la demander vous-même, tirez la liste vers le bas avec un doigt jusqu’à ce que l’icône d’actualisation se remplisse, puis lâchez : elle tourne jusqu’à l’arrivée de la nouvelle liste, puis s’efface. L’icône d’actualisation dans le coin en haut à droite fait exactement la même chose.",
            },
            {
              term: "Terminer une tâche",
              detail:
                "Appuyez sur le cercle de priorité à gauche d’une carte — le même geste que dans Todoist. Elle est terminée immédiatement et quitte la liste, et une barre en bas vous laisse une dizaine de secondes pour annuler.",
            },
            {
              term: "Cibler une tâche",
              detail:
                "Le bouton de ciblage épingle une tâche au-dessus de la liste. C’est la tâche sur laquelle un commentaire de temps est publié, et sa carte porte le total courant du temps que GLU y a enregistré.",
            },
            {
              term: "Le détail d’une tâche",
              detail:
                "Appuyer sur une carte ouvre sa description et ses commentaires — images comprises — dans un panneau sur tablette, en plein écran sur un affichage étroit. C’est en lecture seule ; rien là-dedans ne modifie votre tâche.",
            },
          ]}
        />
        <p>
          <b>Les commentaires de temps.</b> Quand une session se termine avec une tâche
          ciblée, GLU y publie un commentaire&#8239;:{" "}
          <code>[25m] You spent 25 minutes on this</code>. Il attend deux ou trois
          secondes avant d’envoyer — la barre d’annulation peut l’annuler purement et
          simplement dans cette fenêtre — et pendant quelques secondes après son arrivée,
          annuler le supprime de nouveau. Les sessions plus courtes que votre minimum n’en
          reçoivent pas&#8239;; ce minimum est d’une minute, sauf si vous le changez sous{" "}
          <b>Paramètres → Commentaires de temps</b>, où{" "}
          <b>Dire comment vous avez travaillé</b> décide aussi si vos pastilles
          d’environnement sont nommées dans la phrase. Les deux réglages vous montrent le
          commentaire exact que vous obtiendrez.
        </p>
        <p>
          GLU n’écrit jamais que ces deux choses — un commentaire de temps, et terminer ou
          rouvrir une tâche — et uniquement quand vous le lui demandez. Il ne peut pas
          publier de texte arbitraire&#8239;: la phrase est composée sur le serveur de GLU
          à partir des nombres et des pastilles, jamais saisie par la page. Votre
          connexion Todoist est conservée dans un cookie chiffré que votre navigateur ne
          peut pas lire et que le serveur de GLU ne stocke pas&#8239;; tout le trafic vers
          Todoist passe par ce serveur, si bien que le jeton de votre compte n’atteint
          jamais la page. La{" "}
          <LegalLink href="/privacy">Politique de confidentialité</LegalLink> dit le
          reste.
        </p>
      </>
    ),
  },
  {
    heading: "Deux mises en page",
    body: (
      <>
        <p>
          <b>Sur une tablette</b>, tout tient sur un seul écran et la page ne défile
          pas&#8239;: le minuteur occupe la moitié gauche, Todoist le haut à droite, les
          pastilles d’environnement le bas à droite.
        </p>
        <p>
          <b>Sur un écran étroit</b> — un téléphone, ou une demi-tablette — l’horloge
          prend tout le premier écran et le reste s’empile en dessous, la page défile
          donc. L’horloge est ce que vous regardez d’un coup d’œil&#8239;; c’est elle qui
          a la place.
        </p>
      </>
    ),
  },
  {
    heading: "Où se trouve chaque chose",
    body: (
      <>
        <p>
          Le <b>chevron dans le coin en haut à droite</b> est le seul élément permanent de
          l’habillage. Il ouvre le tiroir qui contient&#8239;:
        </p>
        <DataList
          items={[
            { term: "GitHub", detail: "Le code source. GLU est open source." },
            { term: "Apparence", detail: "Sombre ou clair, retenu d’une visite à l’autre." },
            { term: "Manuel", detail: "Cette page." },
            {
              term: "Paramètres",
              detail:
                "Todoist (se connecter ou se déconnecter), Tâches (combien d’éléments une section affiche), Écran (les deux interrupteurs de veille) et Commentaires de temps (ce qui est publié sur Todoist, et quand).",
            },
          ]}
        />
        <p>
          En dessous, des liens vers la{" "}
          <LegalLink href="/privacy">Politique de confidentialité</LegalLink> et les{" "}
          <LegalLink href="/terms">Conditions d’utilisation</LegalLink>.
        </p>
      </>
    ),
  },
  {
    heading: "Les limites, honnêtement",
    body: (
      <ul>
        <li>
          <b>Pas de synchronisation.</b> Votre historique vit dans un navigateur, sur un
          appareil. Un autre navigateur, un autre appareil ou une fenêtre privée est un
          GLU différent, et vide.
        </li>
        <li>
          <b>Pas de mode hors ligne.</b> Installé ou non, il a besoin d’une connexion pour
          démarrer.
        </li>
        <li>
          <b>Quatre-vingt-dix jours.</b> L’archive n’en garde pas plus, et effacer les
          données du site efface tout. Voyez GLU comme un moyen de regarder le travail
          d’aujourd’hui, pas comme un registre officiel — les{" "}
          <LegalLink href="/terms">Conditions d’utilisation</LegalLink> disent la même
          chose en termes plus formels.
        </li>
        <li>
          <b>Un petit serveur, protégé.</b> La connexion Todoist passe par un proxy à
          débit limité. Un usage ordinaire ne le remarquera jamais&#8239;; le matraquer
          vaudra de courts refus temporaires.
        </li>
        <li>
          <b>Pas d’annulation pour «&#8239;Nouvelle journée&#8239;».</b> C’est bien pour
          cela qu’elle demande d’abord.
        </li>
      </ul>
    ),
  },
  {
    heading: "Confidentialité et conditions",
    body: (
      <p>
        La <LegalLink href="/privacy">Politique de confidentialité</LegalLink> expose
        exactement ce que GLU manipule, ce qui reste sur votre appareil et ce qu’il écrit
        dans Todoist. Les <LegalLink href="/terms">Conditions d’utilisation</LegalLink>{" "}
        couvrent l’usage de l’application hébergée. Les deux sont liées à la fin de cette
        page, et depuis le tiroir.
      </p>
    ),
  },
];

const content: DocumentContent = { updated, title, intro, sections };

export default content;
