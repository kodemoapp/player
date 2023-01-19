import React from 'react';
import { KodemoDocument } from '../KodemoPlayer';

// @ts-ignore
import packageJSON from '../../package.json';

export const isEmptyDocument = (doc?: KodemoDocument) => {
  if (doc) {
    const hasStory = typeof doc.story === 'string' && doc.story.length > 0;
    const hasSubjects = doc.subjects && Object.keys(doc.subjects).length > 0;
    return !hasStory && !hasSubjects;
  } else {
    return true;
  }
};

/**
 * Migrates documents to the latest format. All documents
 * pass through this method before being loaded into the
 * player/editor.
 */
export const migrateDocument = (doc: KodemoDocument) => {
  setDefaultProps(doc);
  cleanupIndices(doc);
  setVersion(doc);

  return doc;
};

const setDefaultProps = (doc: KodemoDocument) => {
  if (typeof doc.title !== 'string') doc.title = 'Untitled';
  if (typeof doc.story !== 'string') doc.story = doc.story || '';
  if (typeof doc.subjects !== 'object') doc.subjects = {};
  if (typeof doc.subjectIndex !== 'object') doc.subjectIndex = [];
};

const setVersion = (doc: KodemoDocument) => {
  doc.version = packageJSON.version;
};

const cleanupIndices = (doc: KodemoDocument) => {
  // Remove orphaned subject indices
  doc.subjectIndex = doc.subjectIndex.filter((id: string) => doc.subjects.hasOwnProperty(id));

  // Ensure all subjects are indexed
  Object.entries(doc.subjects).forEach(([subjectId, subject]) => {
    if (doc.subjectIndex.indexOf(subjectId) === -1) {
      doc.subjectIndex.push(subjectId);
    }

    // Ensure all subjects have a versionIndex
    subject.versionIndex = subject.versionIndex || [];

    // Remove orphaned subject versions
    subject.versionIndex = subject.versionIndex.filter((id) => subject.versions.hasOwnProperty(id));

    // Ensure all versions exist in the index
    Object.keys(subject.versions).forEach((versionId) => {
      if (subject.versionIndex.indexOf(versionId) === -1) {
        subject.versionIndex.push(versionId);
      }
    });
  });
};
