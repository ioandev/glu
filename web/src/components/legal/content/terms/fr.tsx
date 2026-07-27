import { LegalLink, type LegalSection } from "@/components/legal/LegalPage";
import type { DocumentContent } from "@/components/docs/content/types";
import { CONTACT_EMAIL } from "../privacy/en";

/**
 * The Terms in French — a translation of `en.tsx`, which remains the
 * authoritative text (ADR 44); the shell renders the notice that says so.
 * `CONTACT_EMAIL` is imported rather than repeated: the address is not
 * translatable and there is one source for it.
 */
const UPDATED = "25 juillet 2026";

const sections: LegalSection[] = [
  {
    heading: "1. Qui exploite GLU",
    body: (
      <p>
        GLU (le «&#8239;Service&#8239;») est un projet personnel et non commercial
        exploité par Ioan Biticu («&#8239;je&#8239;», «&#8239;moi&#8239;») à l’adresse{" "}
        <code>ioan.dev/glu</code>. C’est un minuteur pomodoro et un suivi de concentration
        pensés d’abord pour la tablette, offerts gratuitement et construits au grand jour.
        Vous pouvez me joindre à{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
  {
    heading: "2. Acceptation",
    body: (
      <p>
        En utilisant GLU, vous acceptez les présentes Conditions. Si vous ne les acceptez
        pas, merci de ne pas utiliser le Service. Elles s’appliquent en même temps que la{" "}
        <LegalLink href="/privacy">Politique de confidentialité</LegalLink>, qui décrit
        quelles données sont manipulées et où elles vivent.
      </p>
    ),
  },
  {
    heading: "3. Ce qu’est le Service",
    body: (
      <>
        <p>
          Un minuteur, un relevé des sessions de concentration que vous terminez, et une
          intégration Todoist facultative qui affiche vos tâches, vous permet de les
          terminer, et ajoute un commentaire de suivi du temps quand vous finissez une
          session sur une tâche que vous avez ciblée.
        </p>
        <p>
          C’est un appareil personnel, pas un produit avec un service d’assistance. Les
          fonctionnalités peuvent changer, et le Service peut être interrompu ou
          abandonné à tout moment sans préavis.
        </p>
      </>
    ),
  },
  {
    heading: "4. Vos données sont sur votre appareil",
    body: (
      <>
        <p>
          Votre historique de sessions vit dans le stockage local de votre navigateur — il
          n’y a pas de compte, pas de copie côté serveur, pas de sauvegarde. C’est un
          choix de conception délibéré, et il a une conséquence que vous devriez lire
          comme une condition plutôt que comme une note de bas de page&#8239;:
        </p>
        <ul>
          <li>
            Effacer les données de site de votre navigateur, utiliser la navigation
            privée, ou changer d’appareil ou de navigateur signifie que l’historique est
            perdu ou absent. Il ne peut être récupéré ni par moi ni par personne.
          </li>
          <li>
            L’archive garde au plus les 90 derniers jours&#8239;; les jours plus anciens
            sont abandonnés automatiquement.
          </li>
        </ul>
        <p>
          <b>Ne vous appuyez pas sur GLU comme registre officiel</b> pour des heures
          facturables ou pour quoi que ce soit d’autre qui compte après coup.
        </p>
      </>
    ),
  },
  {
    heading: "5. Votre compte Todoist",
    body: (
      <>
        <p>
          Si vous connectez Todoist, GLU agit sur votre instruction et avec votre
          autorisation. Vous êtes responsable du compte que vous connectez et de la
          vérification de ce que GLU y fait — précisément&#8239;: terminer ou rouvrir les
          tâches sur lesquelles vous appuyez, et publier un unique commentaire de suivi du
          temps quand une session ciblée se termine.
        </p>
        <p>
          Ne connectez qu’un compte que vous contrôlez. Vous pouvez révoquer l’accès à
          tout moment depuis Paramètres → Todoist → Se déconnecter, ou depuis les réglages
          de compte de Todoist lui-même. Todoist est un service distinct, régi par{" "}
          <LegalLink href="https://todoist.com/terms">ses propres conditions</LegalLink>
          &#8239;; je n’en suis pas responsable, ni de sa disponibilité, ni des
          changements apportés à son API.
        </p>
      </>
    ),
  },
  {
    heading: "6. Usage acceptable",
    body: (
      <>
        <p>Vous acceptez de ne pas&#8239;:</p>
        <ul>
          <li>
            inonder, moissonner ou automatiser contre le Service, ni contourner les
            limites de requêtes qu’il applique — elles existent pour qu’un petit serveur
            reste disponible pour tous ceux qui l’utilisent&#8239;;
          </li>
          <li>
            sonder, scanner ou tenter de contourner sa sécurité, ni tenter d’atteindre des
            données appartenant à quelqu’un d’autre&#8239;;
          </li>
          <li>
            connecter un compte Todoist que vous ne contrôlez pas, ni utiliser le Service
            pour interférer avec le compte de quelqu’un d’autre&#8239;;
          </li>
          <li>utiliser le Service à des fins illégales.</li>
        </ul>
        <p>
          Les requêtes au-delà de la limite sont refusées automatiquement, et un trafic
          abusif peut être bloqué sans préavis.
        </p>
      </>
    ),
  },
  {
    heading: "7. Disponibilité",
    body: (
      <p>
        GLU tourne sur une modeste infrastructure personnelle. Il n’y a aucun engagement
        de disponibilité, aucun niveau de service, et aucune garantie qu’une session en
        cours survivra à un redémarrage ou à un déploiement — même si l’état de votre
        minuteur est stocké localement et y survit normalement.
      </p>
    ),
  },
  {
    heading: "8. Propriété intellectuelle et licences",
    body: (
      <p>
        Le code source de GLU est publié sur{" "}
        <LegalLink href="https://github.com/ioandev/glu">GitHub</LegalLink> sous la licence
        Apache 2.0, et les licences des composants tiers dont il dépend sont énumérées
        dans le dépôt. Ces termes de licence régissent le <i>code</i>&#8239;; les
        présentes Conditions régissent votre usage du <i>service hébergé</i>. Le nom GLU,
        son contenu rédactionnel et son design sont les miens&#8239;; le nom et le logo de
        Todoist appartiennent à Doist et sont utilisés pour identifier l’intégration.
      </p>
    ),
  },
  {
    heading: "9. Absence de garantie",
    body: (
      <p>
        Le Service est fourni «&#8239;en l’état&#8239;» et «&#8239;selon
        disponibilité&#8239;», sans garantie d’aucune sorte, expresse ou implicite, y
        compris d’adéquation à un usage particulier. Je ne garantis pas qu’il sera exact,
        ininterrompu, ponctuel ou exempt d’erreurs — y compris qu’une alerte de fin de
        session arrivera à l’heure, ce qui dépend de votre navigateur et de votre système
        d’exploitation.
      </p>
    ),
  },
  {
    heading: "10. Limitation de responsabilité",
    body: (
      <p>
        Dans toute la mesure permise par la loi, je ne suis pas responsable des pertes
        indirectes, accessoires ou consécutives découlant de votre usage du Service, ni de
        la perte de l’historique des sessions, des alertes manquées, ou des modifications
        apportées à votre compte Todoist par l’intermédiaire du Service. Rien ici n’exclut
        une responsabilité qui ne peut légalement être exclue.
      </p>
    ),
  },
  {
    heading: "11. Modifications des présentes Conditions",
    body: (
      <p>
        Les présentes Conditions peuvent changer&#8239;; la date de
        «&#8239;Dernière mise à jour&#8239;» ci-dessus reflète la version en vigueur, et
        continuer à utiliser le Service après un changement vaut acceptation.
      </p>
    ),
  },
  {
    heading: "12. Droit applicable",
    body: (
      <p>
        Les présentes Conditions sont régies par le droit d’Angleterre et du pays de
        Galles. Rien ici ne limite les droits dont vous disposez au titre du droit
        impératif de la consommation ou de la protection des données là où vous vivez.
      </p>
    ),
  },
  {
    heading: "13. Contact",
    body: (
      <p>
        Des questions sur les présentes Conditions&#8239;? Écrivez à{" "}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    ),
  },
];

const content: DocumentContent = {
  updated: UPDATED,
  title: "Conditions d’utilisation",
  intro: (
    <>
      GLU est un minuteur de concentration personnel et gratuit, fourni tel quel. Vos
      données restent sur votre appareil et votre compte Todoist reste le vôtre. La{" "}
      <LegalLink href="/privacy">Politique de confidentialité</LegalLink> couvre le volet
      des données.
    </>
  ),
  sections,
};

export default content;
