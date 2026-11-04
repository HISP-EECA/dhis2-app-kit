const ALWAYS_STRIP = /* @__PURE__ */ new Set([
  "created",
  "lastUpdated",
  "createdBy",
  "lastUpdatedBy",
  "href",
  "access",
  "favorite",
  "favorites",
  "allItems",
  "interpretations",
  "subscribers",
  "subscribed",
  "displayName",
  "displayShortName",
  "displayFormName",
  "displayDescription",
  "displayNumeratorDescription",
  "displayDenominatorDescription"
]);
const LOCAL_CONTEXT_FIELDS = /* @__PURE__ */ new Set([
  "organisationUnits",
  "dataViewOrganisationUnits",
  "teiSearchOrganisationUnits",
  "organisationUnitLevels",
  // NOT organisationUnitGroupSetDimensions. An org unit GROUP SET is a
  // portable thing - "Partner", "Ownership" - and only the org units
  // inside its groups are local. Emptying the dimension removed a column
  // from the visualisation and said nothing, which is a silent change to
  // what the chart shows. The group set travels instead, with its groups
  // emptied of org units exactly as user groups travel without members.
  "catDimensionConstraints",
  "cogsDimensionConstraints"
]);
const USER_LOCAL_FIELDS = /* @__PURE__ */ new Set([
  "lastLogin",
  "passwordLastUpdated",
  "invitation",
  "selfRegistered",
  "externalAuth",
  "twoFactorEnabled",
  "password"
]);
const SYNTHETIC_SCHEMAS = [
  {
    klass: "org.hisp.dhis.mapping.MapView",
    name: "mapView",
    singular: "mapView",
    plural: "mapViews",
    collectionName: "mapViews",
    metadata: false,
    embeddedObject: true,
    properties: [
      ref("legendSet", "org.hisp.dhis.legend.LegendSet"),
      ref("program", "org.hisp.dhis.program.Program"),
      ref("programStage", "org.hisp.dhis.program.ProgramStage"),
      ref("trackedEntityType", "org.hisp.dhis.trackedentity.TrackedEntityType"),
      ref("organisationUnitGroupSet", "org.hisp.dhis.organisationunit.OrganisationUnitGroupSet"),
      refs("organisationUnits", "org.hisp.dhis.organisationunit.OrganisationUnit"),
      refs("itemOrganisationUnitGroups", "org.hisp.dhis.organisationunit.OrganisationUnitGroup"),
      embedded("periods", "org.hisp.dhis.period.Period"),
      embedded("dataDimensionItems", "org.hisp.dhis.common.DataDimensionItem"),
      embedded("categoryDimensions", "org.hisp.dhis.category.CategoryDimension"),
      embedded(
        "organisationUnitGroupSetDimensions",
        "org.hisp.dhis.organisationunit.OrganisationUnitGroupSetDimension"
      )
    ]
  }
];
function ref(name, klass) {
  return { name, fieldName: name, propertyType: "REFERENCE", klass, owner: true, persisted: true };
}
function refs(name, itemKlass) {
  return {
    name,
    fieldName: name,
    collectionName: name,
    propertyType: "COLLECTION",
    itemPropertyType: "REFERENCE",
    itemKlass,
    collection: true,
    owner: true,
    persisted: true
  };
}
function embedded(name, itemKlass) {
  return {
    name,
    fieldName: name,
    collectionName: name,
    propertyType: "COLLECTION",
    itemPropertyType: "COMPLEX",
    itemKlass,
    collection: true,
    embeddedObject: true,
    owner: true,
    persisted: true
  };
}
function withSynthetic(schemas) {
  const live = (schemas || []).filter((s) => s && typeof s === "object");
  const klasses = new Set(live.map((s) => s.klass));
  const names = new Set(live.map((s) => s.singular ?? s.name));
  return [...live, ...SYNTHETIC_SCHEMAS.filter((s) => !klasses.has(s.klass) && !names.has(s.singular))];
}
class SchemaService {
  constructor(schemas) {
    this.byPlural = /* @__PURE__ */ new Map();
    this.byKlass = /* @__PURE__ */ new Map();
    for (const s of schemas) {
      this.byPlural.set(s.plural, s);
      this.byKlass.set(s.klass, s);
    }
  }
  static async load(engine) {
    const { schemas } = await engine.query({
      schemas: {
        resource: "schemas",
        params: {
          fields: "name,singular,plural,klass,metadata,properties[name,fieldName,propertyType,itemPropertyType,klass,itemKlass,owner,persisted,embeddedObject,collection,collectionName,simple,max]"
        }
      }
    });
    return new SchemaService(withSynthetic(schemas.schemas));
  }
  schemaFor(plural) {
    return this.byPlural.get(plural);
  }
  /** Metadata types the instance exposes, as plural names. */
  metadataTypes() {
    return [...this.byPlural.values()].filter((s) => s.metadata).map((s) => s.plural);
  }
  /**
   * Property descriptors for a type, keyed by the name that appears in JSON.
   * DHIS2 uses `fieldName` for collections and `name` otherwise; we index both
   * so a lookup never misses.
   */
  properties(plural) {
    const s = this.byPlural.get(plural);
    if (!s) return /* @__PURE__ */ new Map();
    if (s.__propMap) return s.__propMap;
    const m = /* @__PURE__ */ new Map();
    for (const p of s.properties || []) {
      if (p.name) m.set(p.name, p);
      if (p.fieldName && p.fieldName !== p.name) m.set(p.fieldName, p);
      if (p.collectionName && p.collectionName !== p.name) m.set(p.collectionName, p);
    }
    s.__propMap = m;
    return m;
  }
  /**
   * True when `field` on `plural` holds a reference (or a collection of
   * references) to another metadata object, rather than an embedded object.
   */
  isReference(plural, field) {
    const p = this.properties(plural).get(field);
    if (!p) return false;
    if (p.embeddedObject) return false;
    const t = p.collection ? p.itemPropertyType : p.propertyType;
    return t === "REFERENCE";
  }
  /** The plural type name a reference field points at, when resolvable. */
  targetType(plural, field) {
    const p = this.properties(plural).get(field);
    if (!p) return null;
    const klass = p.collection ? p.itemKlass : p.klass;
    const s = this.byKlass.get(klass);
    return s ? s.plural : null;
  }
  /**
   * The same, for a dotted path - walking through embedded objects.
   *
   * Taking only the first segment is wrong wherever the reference is nested,
   * and the places it is nested are exactly the analytical ones:
   * `mapViews.dataDimensionItems.indicator` resolves on its first segment to
   * mapViews, an embedded shape with no endpoint of its own. Fetching that
   * finds nothing, and an indicator a dashboard plainly needs is reported as
   * unresolvable instead of being pulled in.
   */
  targetTypeForPath(plural, path) {
    let current = plural;
    for (const seg of String(path || "").split(".")) {
      if (!seg) return null;
      const next = this.targetType(current, seg);
      if (!next) return null;
      current = next;
    }
    return current;
  }
  /**
   * True when the type is a metadata type in its own right.
   *
   * Embedded shapes - mapViews, dataDimensionItems, dashboardItems - are
   * described by the schema like anything else but have no endpoint, so a type
   * name is only worth fetching once it has passed this.
   */
  isMetadataType(plural) {
    return !!this.byPlural.get(plural)?.metadata;
  }
  /**
     * The largest a collection may be before DHIS2 refuses the object.
     *
     * The importer enforces cardinality PER PROPERTY, not per payload:
     * DefaultSchemaValidator.validateCollection raises E4007 when a
     * collection is longer than that property's declared max. There is no
     * blanket number, and assuming one is actively wrong - `translations`
     * declares 255 on every type, while `dataSet.organisationUnits` declares
     * Double.MAX_VALUE, so a blanket 255 would reject the 2,000-org-unit
     * data sets that import perfectly well.
     *
     * Returns undefined for "no bound the import can trip", including when
     * the instance did not send max at all, so a missing field can never
     * invent a limit.
     */
  collectionMax(plural, field) {
    const p = this.properties(plural).get(field);
    if (!p?.collection) return void 0;
    const max = Number(p.max);
    if (!Number.isFinite(max) || max <= 0 || max > 1e15) return void 0;
    return max;
  }
  /** Array-valued properties the export actually writes. */
  ownedCollections(plural) {
    const out = [];
    for (const [name, p] of this.properties(plural)) {
      if (p.collection && p.owner && p.persisted) out.push(name);
    }
    return [...new Set(out)];
  }
  /**
   * Fields worth keeping for a type: owned and persisted, minus the audit set.
   * Used as a safety net behind `fields=:owner`, which still returns created,
   * lastUpdated and friends.
   */
  keepFields(plural) {
    const out = /* @__PURE__ */ new Set();
    for (const [name, p] of this.properties(plural)) {
      if (!p.owner || !p.persisted) continue;
      if (ALWAYS_STRIP.has(name)) continue;
      out.add(name);
    }
    out.add("id");
    out.add("sharing");
    out.add("translations");
    out.add("attributeValues");
    return out;
  }
}
export {
  ALWAYS_STRIP,
  LOCAL_CONTEXT_FIELDS,
  SchemaService,
  USER_LOCAL_FIELDS
};
