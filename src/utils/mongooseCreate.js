/**
 * Mongoose 8+: `Model.create(oneDoc, { session })` is invalid — the second arg is treated
 * like a second document. Use `Model.create([doc], { session })` and use the returned doc.
 * @param {import('mongoose').Model} Model
 * @param {object} data
 * @param {{ session?: import('mongoose').ClientSession }} [options]
 */
export async function createWithOptionalSession(Model, data, options = {}) {
  const session = options.session;
  if (session) {
    const docs = await Model.create([data], { session });
    return docs[0];
  }
  return Model.create(data);
}
