import { DataList, LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "./en";

/**
 * The Privacy Policy in French — a translation of `en.tsx`, which remains the
 * authoritative text (ADR 44); the shell renders the notice that says so.
 *
 * A translated policy that promises something the English one does not is a
 * bug, not a style choice: every claim here has to be the same claim, in the
 * same section, in the same order.
 */
const UPDATED = "25 juillet 2026";

const sections: LegalSection[] = [
  {
    heading: "1. En bref",
    body: (
      <ul>
        <li>
          GLU n’a ni comptes, ni base de données, ni outils de mesure d’audience. Il
          n’existe aucune trace de vous côté serveur.
        </li>
        <li>
          Votre historique de concentration — sessions, durées, réglages
          d’environnement — est stocké dans votre propre navigateur et n’est jamais
          téléversé.
        </li>
        <li>
          Todoist est facultatif. Si vous le connectez, vos jetons vivent chiffrés dans un
          cookie que seul le serveur peut ouvrir, et le serveur n’en garde aucune copie.
        </li>
        <li>
          Aucun cookie publicitaire, aucun traceur tiers, aucune bannière de consentement
          nécessaire.
        </li>
      </ul>
    ),
  },
  {
    heading: "2. Qui est responsable",
    body: (
      <p>
        GLU est un projet personnel et non commercial exploité par Ioan Biticu, servi à
        l’adresse <code>ioan.dev/glu</code>. Pour toute question ou demande relative à la
        confidentialité, écrivez à{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "3. Ce qui est stocké sur votre appareil",
    body: (
      <>
        <p>
          GLU conserve son état dans le <b>stockage local</b> de votre navigateur, sous
          une seule clé versionnée. Il n’est jamais téléversé, et il n’existe nulle part
          où le téléverser. Il contient&#8239;:
        </p>
        <DataList
          items={[
            {
              term: "L’état du minuteur",
              detail:
                "Le minuteur en cours ou en pause, sa durée et la durée prédéfinie que vous avez choisie en dernier — pour qu’un rechargement ou un capot fermé ne vous fasse pas perdre votre session.",
            },
            {
              term: "L’historique des sessions",
              detail:
                "Chaque session terminée : quand elle s’est terminée, combien de temps elle a duré, et quels réglages d’environnement étaient actifs. La journée en cours, plus une archive d’au plus les 90 derniers jours.",
            },
            {
              term: "Les préférences",
              detail:
                "Le design d’horloge, le style d’habillage, le thème de couleurs et les interrupteurs de veille.",
            },
            {
              term: "Les choix Todoist",
              detail:
                "Si vous utilisez Todoist : la liste de tâches que vous avez choisie, la tâche que vous avez ciblée, et tout commentaire de suivi du temps encore en attente d’envoi.",
            },
          ]}
        />
        <p>
          Effacer les données du site pour <code>ioan.dev</code> dans votre navigateur
          supprime tout cela, définitivement et complètement.
          «&#8239;Nouvelle journée&#8239;» dans l’application verse le compte visible dans
          l’archive&#8239;; l’archive elle-même est plafonnée à 90 jours et abandonne
          automatiquement le jour le plus ancien.
        </p>
      </>
    ),
  },
  {
    heading: "4. Les cookies",
    body: (
      <>
        <p>
          GLU ne pose aucun cookie publicitaire, de mesure d’audience ou inter-sites. Les
          seuls cookies qu’il peut poser sont strictement nécessaires et n’existent que si
          vous connectez Todoist&#8239;:
        </p>
        <DataList
          items={[
            {
              term: "glu_todoist",
              detail:
                "Vos jetons Todoist chiffrés (scellés). httpOnly, donc les scripts de la page ne peuvent pas le lire ; Secure et SameSite=Lax en production ; limité à /glu. Effacé quand vous vous déconnectez.",
            },
            {
              term: "glu_oauth_state",
              detail:
                "Une valeur anti-falsification de courte durée, utilisée pendant la connexion, valable dix minutes et jetée immédiatement après.",
            },
          ]}
        />
        <p>
          Parce que les deux sont strictement nécessaires à une fonction que vous avez
          délibérément lancée, il n’y a pas de bannière de consentement. Une bannière qui
          demande la permission pour ce que vous venez de cliquer est du théâtre, et elle
          apprend aux gens à ignorer celles qui comptent.
        </p>
        <p>
          Votre préférence de thème de couleurs est elle aussi retenue dans le stockage du
          navigateur. C’est un réglage, pas du pistage.
        </p>
      </>
    ),
  },
  {
    heading: "5. Todoist",
    body: (
      <>
        <p>
          Connecter Todoist est entièrement facultatif&#8239;; tout le reste de GLU
          fonctionne sans. Si vous le connectez&#8239;:
        </p>
        <ul>
          <li>
            Vous autorisez GLU via l’écran OAuth de Todoist lui-même. GLU demande un accès
            en lecture et en écriture, parce qu’il affiche vos tâches et — uniquement sur
            votre action — les termine et y ajoute un commentaire de temps.
          </li>
          <li>
            Les jetons obtenus sont{" "}
            <b>scellés (chiffrés) dans un cookie httpOnly</b>. Le navigateur détient un
            bloc opaque qu’il ne peut pas déchiffrer&#8239;; le serveur peut l’ouvrir mais
            ne stocke rien. Il n’y a pas de base de données de jetons parce qu’il n’y a
            pas de base de données.
          </li>
          <li>
            <b>Tout le trafic Todoist passe par le serveur de GLU lui-même</b>, si bien
            que votre jeton n’atteint jamais la page et que votre navigateur ne contacte
            jamais Todoist directement. Les images et les pièces jointes des tâches sont
            récupérées de la même façon, et c’est pourquoi votre navigateur ne parle pas
            non plus au CDN de Todoist.
          </li>
        </ul>
        <p>
          Ce que GLU <b>écrit</b> dans votre compte, et uniquement quand vous le lui
          demandez&#8239;: terminer ou rouvrir une tâche, et publier un unique commentaire
          de suivi du temps de la forme <code>[25m] You spent 25 minutes on this</code>.
          Cette phrase est composée par le serveur, pas par la page — GLU ne peut pas
          publier de texte arbitraire sur vos tâches.
        </p>
        <p>
          Vous pouvez vous déconnecter à tout moment&#8239;:{" "}
          <b>Paramètres → Todoist → Se déconnecter</b> efface le cookie, et révoquer GLU
          dans les réglages de votre compte Todoist coupe l’accès immédiatement, et
          indépendamment de ce que je fais.
        </p>
      </>
    ),
  },
  {
    heading: "6. Ce que le serveur voit",
    body: (
      <>
        <p>
          Le serveur est un proxy sans état. Il n’a pas de base de données, pas de
          stockage de sessions et pas de fiches utilisateur. Il ne voit que ce que voit
          n’importe quel serveur web en traitant une requête&#8239;:
        </p>
        <ul>
          <li>
            <b>Des compteurs de limitation de débit.</b> Pour qu’un petit conteneur reste
            disponible, les requêtes sont comptées par client. La clé du compteur est
            dérivée de votre adresse IP (l’IPv6 est regroupée par préfixe réseau, jamais
            l’adresse individuelle), tenue <b>en mémoire seulement</b>, jamais écrite sur
            disque, et entièrement perdue au redémarrage du processus. La ligne de journal
            d’une requête refusée ne contient délibérément aucune adresse.
          </li>
          <li>
            <b>Des journaux d’exploitation ordinaires</b> — erreurs et diagnostics
            nécessaires pour garder le site en marche. Il n’y a pas de chaîne d’analyse,
            pas de suivi d’événements et pas de profilage.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. Les tiers",
    body: (
      <>
        <ul>
          <li>
            <b>Todoist</b> — uniquement si vous le connectez. Votre usage de Todoist est
            régi par{" "}
            <LegalLink href="https://todoist.com/privacy">
              leur politique de confidentialité
            </LegalLink>
            .
          </li>
          <li>
            <b>L’infrastructure d’hébergement</b> — les serveurs sur lesquels le site
            tourne, qui traitent les requêtes pour mon compte.
          </li>
        </ul>
        <p>
          C’est toute la liste. GLU ne charge ni polices, ni scripts, ni images depuis le
          serveur de quelqu’un d’autre&#8239;: sa politique de sécurité du contenu
          n’autorise que sa propre origine, si bien qu’un traceur tiers ne pourrait même
          pas s’exécuter s’il en était ajouté un par accident.
        </p>
      </>
    ),
  },
  {
    heading: "8. Les permissions que l’application demande",
    body: (
      <>
        <p>
          Chacune d’elles est une permission du navigateur, traitée entièrement sur votre
          appareil. Rien à leur sujet n’est signalé où que ce soit, et en refuser une
          laisse le minuteur parfaitement utilisable.
        </p>
        <DataList
          items={[
            {
              term: "Les notifications",
              detail:
                "Pour qu’une session terminée puisse vous joindre quand GLU est dans un onglet en arrière-plan. Demandée une fois, au premier Démarrer ; un refus est retenu par votre navigateur et n’est plus jamais redemandé.",
            },
            {
              term: "Le maintien de l’écran allumé",
              detail:
                "Pour que la tablette ne s’endorme pas en pleine session. Contrôlé par les deux interrupteurs dans Paramètres → Écran.",
            },
            {
              term: "Le son",
              detail:
                "Chaque son de fin de session est généré dans le navigateur. Aucun fichier audio n’est téléchargé et rien n’est enregistré — GLU ne demande jamais l’accès au microphone ni à la caméra.",
            },
          ]}
        />
      </>
    ),
  },
  {
    heading: "9. La conservation",
    body: (
      <p>
        Sur votre appareil&#8239;: aussi longtemps que vous le gardez — l’archive des
        sessions se limite d’elle-même à 90 jours, et effacer les données du site retire
        tout d’un coup. Sur le serveur&#8239;: rien n’est conservé, parce que rien n’est
        stocké. Le cookie Todoist vit dans votre navigateur jusqu’à ce que vous vous
        déconnectiez ou qu’il expire&#8239;; les compteurs de limitation de débit
        disparaissent au redémarrage&#8239;; les journaux d’exploitation sont gardés
        brièvement, pour la sécurité et le débogage.
      </p>
    ),
  },
  {
    heading: "10. Vos droits",
    body: (
      <p>
        Selon l’endroit où vous vivez, vous pouvez avoir le droit d’accéder aux données
        personnelles détenues à votre sujet, de les corriger, de les exporter ou de les
        supprimer, et de vous opposer à leur traitement. GLU est construit de telle sorte
        qu’il n’y a presque rien contre quoi les exercer&#8239;: pas de compte, pas de
        profil côté serveur, et un historique local que vous seul pouvez lire. Pour tout
        ce que vous pensez que je détiendrais, écrivez à{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink> et j’y
        donnerai suite.
      </p>
    ),
  },
  {
    heading: "11. Les enfants",
    body: (
      <p>
        GLU ne s’adresse pas aux enfants et je ne collecte pas sciemment de données auprès
        de personnes de moins de 16 ans.
      </p>
    ),
  },
  {
    heading: "12. Les modifications",
    body: (
      <p>
        Si GLU se met un jour à traiter les données différemment, cette page change avec
        lui et la date de «&#8239;Dernière mise à jour&#8239;» ci-dessus avance. Le projet
        est open source, donc le changement est visible dans son historique autant qu’ici.
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated: UPDATED,
  title: "Politique de confidentialité",
  intro: (
    <>
      GLU est un minuteur pomodoro et un suivi de concentration qui garde vos données sur
      votre propre appareil. Cette page explique exactement ce qu’il manipule, où cela va,
      et ce qu’il ne fait jamais. Elle s’applique en même temps que les{" "}
      <LegalLink href="/terms">Conditions d’utilisation</LegalLink>.
    </>
  ),
  sections,
};

export default content;
