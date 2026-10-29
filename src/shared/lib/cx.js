// Concatène des noms de classes en ignorant les valeurs vides.
export const cx = (...parts) => parts.filter(Boolean).join(' ')
