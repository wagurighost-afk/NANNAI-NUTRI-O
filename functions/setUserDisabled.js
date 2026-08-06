/**
 * Cloud Function: disable/enable Auth users (Admin SDK only).
 * Deploy alongside sendAuditReportEmail. Frontend calls VITE_ADMIN_USER_API_URL.
 *
 * Body: { uid: string, disabled: boolean, idToken?: string }
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.setUserDisabled = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const { uid, disabled, idToken } = req.body || {};
    if (!uid || typeof disabled !== 'boolean') {
      res.status(400).json({ message: 'uid e disabled são obrigatórios' });
      return;
    }

    try {
      if (idToken) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const actorSnap = await admin
          .firestore()
          .collection('users')
          .doc(decoded.uid)
          .get();
        const actor = actorSnap.data();
        if (!actor || actor.role !== 'admin' || actor.isActive === false) {
          res.status(403).json({ message: 'Somente administradores' });
          return;
        }
        if (decoded.uid === uid) {
          res.status(400).json({
            message: 'Não é permitido desativar a própria conta',
          });
          return;
        }
      }

      const activeAdmins = await admin
        .firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .where('isActive', '==', true)
        .get();

      if (disabled && activeAdmins.size <= 1) {
        const only = activeAdmins.docs[0];
        if (!only || only.id === uid) {
          res.status(400).json({
            message: 'Deve permanecer ao menos um administrador ativo',
          });
          return;
        }
      }

      await admin.auth().updateUser(uid, { disabled });
      await admin.firestore().collection('users').doc(uid).set(
        {
          active: !disabled,
          isActive: !disabled,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      res.status(200).json({ ok: true, uid, disabled });
    } catch (err) {
      res.status(500).json({
        message: err.message || 'Erro ao atualizar usuário',
      });
    }
  });
});
