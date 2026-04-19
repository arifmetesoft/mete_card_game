const LEVEL_DEFINITIONS = [
  { id: 1, tasks: { goldTarget: 50, distanceTarget: 1000 } },
  { id: 2, tasks: { goldTarget: 80, distanceTarget: 1400 } },
  { id: 3, tasks: { goldTarget: 100, distanceTarget: 2000 } },
  { id: 4, tasks: { goldTarget: 130, distanceTarget: 2200 } },
  { id: 5, tasks: { goldTarget: 160, distanceTarget: 2500 } },
  { id: 6, tasks: { goldTarget: 190, distanceTarget: 2800 } },
  { id: 7, tasks: { goldTarget: 220, distanceTarget: 3100 } },
  { id: 8, tasks: { goldTarget: 250, distanceTarget: 3400 } },
  { id: 9, tasks: { goldTarget: 285, distanceTarget: 3600 } },
  { id: 10, tasks: { goldTarget: 320, distanceTarget: 4000 } }
];

export const LEVELS = Object.freeze(
  LEVEL_DEFINITIONS.map((level) =>
    Object.freeze({
      id: level.id,
      name: `Bolum ${level.id}`,
      tasks: Object.freeze({
        goldTarget: level.tasks.goldTarget,
        distanceTarget: level.tasks.distanceTarget
      })
    })
  )
);
