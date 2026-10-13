import type { FeedbackFormConfig, FeedbackFormField, FeedbackSubmission } from '../types';

const sortFields = (fields: FeedbackFormField[]) =>
  [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const inferHistoricalFieldType = (value: unknown): FeedbackFormField['type'] => {
  if (Array.isArray(value)) return 'checkbox';
  if (typeof value === 'number' && value >= 1 && value <= 10) return 'rating';
  return typeof value === 'string' && value.length > 120 ? 'textarea' : 'text';
};

/**
 * Resolves the questions that belong to a stored submission.
 * Historical submissions must use their own formId rather than the form that is
 * currently assigned to the meeting. If a form was edited and old field IDs no
 * longer exist, synthetic fields keep those stored answers visible.
 */
export const getSubmissionFields = (
  submission: FeedbackSubmission,
  formConfigs: FeedbackFormConfig[],
  fallbackFields: FeedbackFormField[] = []
): FeedbackFormField[] => {
  const answers = submission.answers || {};
  const answerKeys = Object.keys(answers);
  const submissionForm = submission.formId
    ? formConfigs.find(config => config.id === submission.formId)
    : undefined;
  const preferredFields = sortFields(submissionForm?.fields || fallbackFields);
  const allKnownFields = formConfigs.flatMap(config => config.fields || []);
  const resolved: FeedbackFormField[] = [];
  const includedIds = new Set<string>();

  // Only include questions that this submission can actually answer. This
  // prevents a newer form version from producing a row full of blank dashes.
  preferredFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(answers, field.id)) {
      resolved.push(field);
      includedIds.add(field.id);
    }
  });

  answerKeys.forEach((fieldId, index) => {
    if (includedIds.has(fieldId)) return;

    const knownField = allKnownFields.find(field => field.id === fieldId);
    if (knownField) {
      resolved.push(knownField);
    } else {
      resolved.push({
        id: fieldId,
        label: `Historical question (${fieldId})`,
        type: inferHistoricalFieldType(answers[fieldId]),
        required: false,
        options: [],
        order: preferredFields.length + index
      });
    }
    includedIds.add(fieldId);
  });

  return resolved.map((field, index) => ({ ...field, order: index }));
};

/** Builds one set of columns that can display every stored answer. */
export const getSubmissionFieldUnion = (
  submissions: FeedbackSubmission[],
  formConfigs: FeedbackFormConfig[],
  fallbackFields: FeedbackFormField[] = []
): FeedbackFormField[] => {
  const fieldsById = new Map<string, FeedbackFormField>();

  submissions.forEach(submission => {
    getSubmissionFields(submission, formConfigs, fallbackFields).forEach(field => {
      if (!fieldsById.has(field.id)) fieldsById.set(field.id, field);
    });
  });

  return Array.from(fieldsById.values()).map((field, index) => ({ ...field, order: index }));
};
