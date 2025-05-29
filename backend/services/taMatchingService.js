/**
 * Service for matching students with their assigned TA based on syllabus rules
 */

class TAMatchingService {
  /**
   * Match a student to their TA based on assignment rules
   * @param {Object} user - User object with lastName and studentId
   * @param {Array} contacts - Array of contacts from syllabus
   * @returns {Object|null} Matched TA contact or null if no match
   */
  static matchStudentToTA(user, contacts) {
    if (!contacts || !Array.isArray(contacts)) {
      console.log("No contacts array provided to matchStudentToTA");
      return null;
    }
    
    if (contacts.length === 0) {
      console.log("Empty contacts array provided to matchStudentToTA");
      return null;
    }

    // Filter to only TAs with assignment rules
    const tasWithRules = contacts.filter(
      (contact) =>
        contact.role &&
        contact.role.toLowerCase().includes("ta") &&
        contact.assignmentRule
    );

    if (tasWithRules.length === 0) {
      return null;
    }

    // Try to match based on available student info
    for (const ta of tasWithRules) {
      const rule = ta.assignmentRule.toLowerCase();

      // Match by last name range (e.g., "Last names A-M" or "Students A-M")
      if (user.lastName && rule.includes("last name")) {
        const matchResult = this.matchByLastNameRange(user.lastName, rule);
        if (matchResult) {
          return ta;
        }
      }

      // Match by student ID/EID patterns (e.g., "EIDs starting with 1-5" or "Student IDs 000-499")
      if (user.studentId && (rule.includes("eid") || rule.includes("student id"))) {
        const matchResult = this.matchByStudentId(user.studentId, rule);
        if (matchResult) {
          return ta;
        }
      }

      // Direct last name match without "last name" keyword (e.g., "A-M")
      if (user.lastName && /^[a-z]-[a-z]$/i.test(rule.trim())) {
        const matchResult = this.matchByLastNameRange(user.lastName, rule);
        if (matchResult) {
          return ta;
        }
      }
    }

    // If no specific match found, return first TA as fallback
    const firstTA = contacts.find(
      (contact) => contact.role && contact.role.toLowerCase().includes("ta")
    );
    return firstTA || null;
  }

  /**
   * Match student by last name range
   * @param {string} lastName - Student's last name
   * @param {string} rule - Assignment rule string
   * @returns {boolean} True if matches
   */
  static matchByLastNameRange(lastName, rule) {
    if (!lastName || !rule) return false;

    const firstLetter = lastName.charAt(0).toUpperCase();
    
    // Extract range patterns like "A-M", "N-Z", etc.
    const rangePattern = /([A-Z])\s*[-–]\s*([A-Z])/gi;
    const matches = [...rule.matchAll(rangePattern)];

    for (const match of matches) {
      const startLetter = match[1].toUpperCase();
      const endLetter = match[2].toUpperCase();

      if (firstLetter >= startLetter && firstLetter <= endLetter) {
        return true;
      }
    }

    return false;
  }

  /**
   * Match student by ID patterns
   * @param {string} studentId - Student's ID/EID
   * @param {string} rule - Assignment rule string
   * @returns {boolean} True if matches
   */
  static matchByStudentId(studentId, rule) {
    if (!studentId || !rule) return false;

    // Match patterns like "starting with 1-5" or "beginning with 1-5"
    const startingWithPattern = /(starting|beginning)\s+with\s+(\d+)\s*[-–]\s*(\d+)/i;
    const startingMatch = rule.match(startingWithPattern);

    if (startingMatch) {
      const firstDigit = parseInt(studentId.charAt(0));
      const startRange = parseInt(startingMatch[2]);
      const endRange = parseInt(startingMatch[3]);

      if (!isNaN(firstDigit) && firstDigit >= startRange && firstDigit <= endRange) {
        return true;
      }
    }

    // Match patterns like "000-499" or "500-999"
    const rangePattern = /(\d{3,})\s*[-–]\s*(\d{3,})/g;
    const rangeMatches = [...rule.matchAll(rangePattern)];

    for (const match of rangeMatches) {
      const startRange = parseInt(match[1]);
      const endRange = parseInt(match[2]);
      const idNumber = parseInt(studentId);

      if (!isNaN(idNumber) && idNumber >= startRange && idNumber <= endRange) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all TAs from contacts
   * @param {Array} contacts - Array of contacts from syllabus
   * @returns {Array} Array of TA contacts
   */
  static getAllTAs(contacts) {
    if (!contacts || !Array.isArray(contacts)) {
      return [];
    }

    return contacts.filter(
      (contact) => contact.role && contact.role.toLowerCase().includes("ta")
    );
  }

  /**
   * Enhanced matching with detailed result
   * @param {Object} user - User object
   * @param {Array} contacts - Contacts array
   * @returns {Object} Match result with details
   */
  static getDetailedMatch(user, contacts) {
    const matchedTA = this.matchStudentToTA(user, contacts);
    const allTAs = this.getAllTAs(contacts);

    return {
      matchedTA,
      allTAs,
      matchCriteria: {
        hasLastName: !!user.lastName,
        hasStudentId: !!user.studentId,
        matchedBy: matchedTA ? this.getMatchReason(user, matchedTA) : null,
      },
    };
  }

  /**
   * Determine how the student was matched to TA
   * @private
   */
  static getMatchReason(user, ta) {
    if (!ta.assignmentRule) return "default";

    const rule = ta.assignmentRule.toLowerCase();

    if (user.lastName && (rule.includes("last name") || /^[a-z]-[a-z]$/i.test(rule.trim()))) {
      return "lastName";
    }

    if (user.studentId && (rule.includes("eid") || rule.includes("student id"))) {
      return "studentId";
    }

    return "fallback";
  }
}

module.exports = TAMatchingService;