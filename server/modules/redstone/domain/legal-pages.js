/** E07 — contenu pages légales site (RGPD). */
const LEGAL_PAGES = Object.freeze({
  'mentions-legales': {
    title: 'Mentions légales',
    body_md: `# Mentions légales

**RedStone Formations**  
Organisme de formation professionnelle.

## Éditeur du site

RedStone Formations  
Contact : [contact@redstoneformations.fr](mailto:contact@redstoneformations.fr)

## Hébergement

Le portail formation est hébergé sur une infrastructure sécurisée (HTTPS).

## Propriété intellectuelle

Les supports de formation publiés sur ce portail sont la propriété de RedStone Formations ou de ses partenaires. Toute reproduction non autorisée est interdite.

## Données personnelles

Voir la [politique de confidentialité](/fr/politique-confidentialite).

## Droit applicable

Droit français.
`
  },
  'politique-confidentialite': {
    title: 'Politique de confidentialité',
    body_md: `# Politique de confidentialité

## Responsable du traitement

RedStone Formations — contact@redstoneformations.fr

## Données collectées

Dans le cadre des formations, nous traitons : identité, coordonnées professionnelles, données de présence (émargement externe), et traces techniques minimales (logs serveur).

## Finalités

- Organisation et suivi des sessions de formation
- Communication pédagogique (liens Teams, supports)
- Obligations légales (facturation, archivage réglementaire)

## Durée de conservation

Les données liées à une session sont conservées pendant la durée légale applicable aux documents de formation, puis supprimées ou anonymisées sur demande.

## Vos droits

Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité.  
Contact : contact@redstoneformations.fr

## Cookies

Le portail stagiaire **n'utilise pas de cookie de session** pour l'accès aux supports (accès invité par lien).
`
  }
})

module.exports = { LEGAL_PAGES }
