'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TargetExam } from '@/lib/exams';
import type { DashboardSession } from '@/lib/exam-dashboard';

export type FirestoreSessionDoc = {
  userId: string;
  targetExam: TargetExam;
  title: string;
  state: string;
  phase: string;
  topic: string;
  date: string;
  hasImage?: boolean;
  messages: DashboardSession['messages'];
  problem_text?: string;
  detected_topic?: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>;
};

export type UserProfileDoc = {
  email: string;
  targetExam?: TargetExam;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  updatedAt?: Timestamp | ReturnType<typeof serverTimestamp>;
};

function sessionToFirestore(
  session: DashboardSession,
  userId: string,
  targetExam: TargetExam
): Omit<FirestoreSessionDoc, 'createdAt' | 'updatedAt'> {
  return {
    userId,
    targetExam,
    title: session.title,
    state: session.state,
    phase: session.phase,
    topic: session.topic,
    date: session.date,
    hasImage: session.hasImage ?? false,
    messages: session.messages,
    problem_text: session.title,
    detected_topic: session.topic,
  };
}

function firestoreToSession(id: string, data: FirestoreSessionDoc): DashboardSession {
  return {
    id,
    title: data.title,
    state: data.state,
    phase: data.phase as DashboardSession['phase'],
    topic: data.topic,
    date: data.date,
    hasImage: data.hasImage,
    messages: data.messages ?? [],
  };
}

export async function loadUserTargetExam(userId: string): Promise<TargetExam | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  const data = snap.data() as UserProfileDoc;
  return data.targetExam ?? null;
}

export async function saveUserTargetExam(userId: string, targetExam: TargetExam): Promise<void> {
  await setDoc(
    doc(db, 'users', userId),
    { targetExam, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function loadUserSessions(
  userId: string,
  targetExam: TargetExam
): Promise<DashboardSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    where('targetExam', '==', targetExam)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => firestoreToSession(d.id, d.data() as FirestoreSessionDoc));
}

export async function upsertSession(
  userId: string,
  targetExam: TargetExam,
  session: DashboardSession,
  isNew: boolean
): Promise<void> {
  const ref = doc(db, 'sessions', session.id);
  const payload = sessionToFirestore(session, userId, targetExam);

  if (isNew) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(
      ref,
      {
        ...payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function deleteSessionFromFirestore(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'sessions', sessionId));
}
