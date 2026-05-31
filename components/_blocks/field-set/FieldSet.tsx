import styles from './FieldSet.module.scss';

type Props = { fields?: string[] };

export function FieldSet({ fields = ['firstName', 'lastName', 'email'] }: Props) {
  return (
    <div className={styles.fields}>
      {fields.map((field) => (
        <label key={field}>
          <span>{labelFor(field)}</span>
          <input type={field === 'email' ? 'email' : field === 'dob' ? 'date' : 'text'} name={field} />
        </label>
      ))}
    </div>
  );
}

function labelFor(field: string) {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
