// ---
// Find all `birthday` events:
//  - if will occur in next 2 weeks -> create `birthday_gift`
// Find all `birthday_gift` events:
//  - if they passed, move them to today
// ---

let birthday_gift_days = 14;

fn process(events) {
  let now = now();

  for (id, event) in events {
    if !event.is_custom() {
      continue;
    }

    switch event.get_custom_type() {
      "birthday" => {
        let start_at = event.get_start_at();
        let end_at = event.get_end_at();

        let gift_event = events.find_custom_events({
          custom_type: "birthday_gift"
          x_birthday_id: id,
        });

        if !gift_event {
          continue;
        }

        if event.start_after(now) && event.end_before(now + birthday_gift_days) {
          events.create_custom_event(id, "birthday_gift", event.get_start_at(), event.get_end_at());
        }
      },
      "birthday_gift" => {
        let start_at = event.get_start_at();
        let end_at = event.get_end_at();

        if event.start_before(now) && event.end_after(now - birthday_gift_days) {
          events.create_custom_event(id, "birthday", event.get_start_at(), event.get_end_at());
        }
      }
    }
  }
}