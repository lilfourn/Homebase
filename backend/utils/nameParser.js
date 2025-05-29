/**
 * Utility functions for parsing and extracting names
 */

/**
 * Extract last name from a full name string
 * @param {string} fullName - The full name string
 * @returns {Object} Object containing firstName and lastName
 */
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }

  // Trim and remove extra spaces
  const cleanName = fullName.trim().replace(/\s+/g, ' ');
  
  // Split by spaces
  const parts = cleanName.split(' ');
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  
  if (parts.length === 1) {
    // Only one name part - treat as first name
    return { firstName: parts[0], lastName: '' };
  }
  
  // Common name suffixes to handle
  const suffixes = ['Jr', 'Jr.', 'Sr', 'Sr.', 'II', 'III', 'IV', 'PhD', 'MD'];
  
  // Check if last part is a suffix
  let lastNameIndex = parts.length - 1;
  let suffix = '';
  
  if (suffixes.includes(parts[lastNameIndex])) {
    suffix = parts[lastNameIndex];
    lastNameIndex--;
  }
  
  // Handle cases with 2 or more parts
  if (lastNameIndex > 0) {
    const lastName = parts[lastNameIndex];
    const firstName = parts.slice(0, lastNameIndex).join(' ');
    return { firstName, lastName };
  }
  
  // Fallback
  return { firstName: cleanName, lastName: '' };
}

/**
 * Get initials from a name
 * @param {string} fullName - The full name
 * @returns {string} Initials
 */
function getInitials(fullName) {
  if (!fullName) return '';
  
  return fullName
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Extract and ensure user has required name fields
 * @param {Object} user - User object
 * @returns {Object} User object with extracted names
 */
function ensureUserNames(user) {
  if (!user) return user;
  
  // If lastName is already set, just return the user
  if (user.lastName && user.lastName.trim()) {
    return user;
  }
  
  // If fullName exists but lastName doesn't, try to extract it
  if (user.fullName && !user.lastName) {
    const { firstName, lastName } = parseFullName(user.fullName);
    user.extractedFirstName = firstName;
    user.extractedLastName = lastName;
    
    // Only use extracted lastName if it's valid
    if (lastName) {
      user.lastName = lastName;
    }
  }
  
  return user;
}

module.exports = {
  parseFullName,
  getInitials,
  ensureUserNames
};