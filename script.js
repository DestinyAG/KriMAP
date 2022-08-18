"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const deleteBtn = document.querySelector(".delete__btn span");
const deleteAllBtn = document.querySelector(".delete--All");
const deleteConfirmation = document.querySelector(".modal-content");
const confirmDeletBtn = document.querySelector(".deletebtn");
const confirmCancelBtn = document.querySelector(".cancelbtn");

class Workout {
  date = new Date();
  id = Date.now().toString().slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }

  calcPace() {
    //Unit: min/km

    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    //unit: km/hr

    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////

//APPLICATION ARCHITECTURE
class App {
  map;
  #mapEvent;
  #workouts = [];
  #mapZoomlevel = 13;

  constructor() {
    //Get Users Position
    this.#getPosition();

    //Get Local Storage
    this.#getLocalStorage();

    if (!document.querySelector(".workout"))
      deleteAllBtn.style.display = "none";

    //Attach event Handlers
    form.addEventListener("submit", this.#newWorkout.bind(this));
    inputType.addEventListener("change", this.#toggleElevationField);
    containerWorkouts.addEventListener("click", this.#moveToPopup.bind(this));
    deleteAllBtn.addEventListener("click", this.deleteAll);
    deleteConfirmation.addEventListener("click", this.deleteAllWorkouts);
  }

  #getPosition() {
    !!navigator.geolocation &&
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert("Could not get your location");
        }
      );
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.map = L.map("map").setView(coords, this.#mapZoomlevel);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    //Handling Click on map
    this.map.on("click", this.#showForm.bind(this));

    //Render marker from local storage
    this.#workouts.forEach((work) => this.#renderWorkoutMarker(work));
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  #hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  #toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  #newWorkout(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    //If workout is running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Input has to be positive numbers");

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //If workout is cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Input has to be positive numbers");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to workout Array
    this.#workouts.push(workout);
    console.log(workout);
    //Render workout on map as a marker
    this.#renderWorkoutMarker(workout);

    //Render workout on list
    this.#renderWorkout(workout);

    //Hide form + Clear Input fields
    this.#hideForm();

    //Set local storage to all workouts
    this.#setLocalStorage();
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        ` ${workout.type === "running" ? "🏃" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = ` 
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <button type="button" title="edit-btn" class="edit__btn"><span aria-hidden="true" data-name="edit" >🖋</span></button>
     <button type="button" title="delete-btn" class="delete__btn"><span aria-hidden="true" data-name="delete">×</span></button>
    <h2 class="workout__title">${workout.description}</h2> 
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === "running" ? "🏃" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === "running")
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>
`;

    if (workout.type === "cycling")
      html += ` 
<div class="workout__details">
<span class="workout__icon">⚡️</span>
<span class="workout__value">${workout.speed.toFixed(1)}</span>
<span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
<span class="workout__icon">⛰</span>
<span class="workout__value">${workout.elevationGain}</span>
<span class="workout__unit">m</span>
</div>
</li>
`;

    form.insertAdjacentHTML("afterend", html);
    deleteAllBtn.style.display = "";
    return this;
  }

  #moveToPopup(e) {
    const event = e;
    const workoutEl = e.target.closest(".workout");
    // console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.map.setView(workout.coords, this.#mapZoomlevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    if (e.target.dataset.name === "delete") {
      this.#deleteWorkout(event);
    }

    if (e.target.dataset.name === "edit") {
      this.#editWorkout(event);
    }
  }

  #deleteWorkout(e) {
    //Get Workout HTML
    const targetWorkout = e.target.closest(".workout");

    //Get workout array from local storage
    const localData = JSON.parse(localStorage.getItem("workouts"));

    //Find the targeted workout in local storage array
    const targetData = localData.find(
      (targetWork) => targetWork.id === targetWorkout.dataset.id
    );

    //Remove the targeted workout out of workout list & and return a new array of workouts
    const workArray = this.#workouts.filter(
      (workData) => workData.id !== targetData.id
    );

    // set the new array to be new this.#workouts
    this.#workouts = workArray;

    ///Reset
    this.#reset();
    this.#setLocalStorage();
    this.#getLocalStorage();
  }

  #editWorkout(e) {
    //Get Workout HTML
    let targetWorkout = e.target.closest(".workout");

    //Get workout array from local storage
    const localData = JSON.parse(localStorage.getItem("workouts"));

    //Find the targeted workout in local storage array
    const targetData = localData.find(
      (targetWork) => targetWork.id === targetWorkout.dataset.id
    );
    console.log(targetData);

    targetWorkout.outerHTML = ` <form class="new--form">
      <div class="new-form__row">
        <label class="new-form__label">Type</label>
        <select title="formInput" class="new-form__input new-form__input--type">
        <option value="running">Running</option>
        <option value="cycling">Cycling</option>
        </select>
      </div>
      <div class="new-form__row">
        <label class="new-form__label">Distance</label>
        <input class="new-form__input new-form__input--distance" value=${targetData.distance} />
      </div>
      <div class="new-form__row">
        <label class="new-form__label">Duration</label>
        <input
          class="new-form__input new-form__input--duration"
          value=${targetData.duration}
        />
      </div>
      <div class="new-form__row toggleRow">
        <label class="new-form__label">Cadence</label>
        <input
          class="new-form__input new-form__input--cadence"
         placeholder = "step/min"
        />
      </div>
      <div class="new-form__row new-form__row--hidden toggleRow">
        <label class="new-form__label">Elev Gain</label>
        <input
          class="new-form__input new-form__input--elevation"
         placeholder="km"
        />
      </div>
      <button type="submit" class="new-form__btn">OK</button>
    </form>`;

    document
      .querySelector(".new-form__input--type")
      .addEventListener("change", function () {
        document
          .querySelector(".new-form__input--elevation")
          .closest(".new-form__row")
          .classList.toggle("new-form__row--hidden");
        document
          .querySelector(".new-form__input--cadence")
          .closest(".new-form__row")
          .classList.toggle("new-form__row--hidden");
      });

    document
      .querySelector(".new--form")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        const validInputs = (...inputs) =>
          inputs.every((inp) => Number.isFinite(inp));

        const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

        //Get data from form
        targetData.type = document.querySelector(
          ".new-form__input--type"
        ).value;
        targetData.distance = +document.querySelector(
          ".new-form__input--distance"
        ).value;
        targetData.duration = +document.querySelector(
          ".new-form__input--duration"
        ).value;

        //If workout is running, create running object
        if (targetData.type === "running") {
          targetData.cadence = +document.querySelector(
            ".new-form__input--cadence"
          ).value;

          //Check if data is valid
          if (
            !validInputs(
              targetData.distance,
              targetData.duration,
              targetData.cadence
            ) ||
            !allPositive(
              targetData.distance,
              targetData.duration,
              targetData.cadence
            )
          )
            return alert("Input has to be positive numbers");

          if (!!targetData.speed) {
            delete targetData["speed"];
          }
          if (!!targetData.elevationGain) {
            delete targetData["elevationGain"];
          }
          //Unit: min/km
          targetData.pace = targetData.duration / targetData.distance;
          targetData.pace;
        }
        //If workout is cycling, create cycling object
        if (targetData.type === "cycling") {
          targetData.elevationGain = +document.querySelector(
            ".new-form__input--elevation"
          ).value;

          if (
            !validInputs(
              targetData.distance,
              targetData.duration,
              targetData.elevationGain
            ) ||
            !allPositive(targetData.distance, targetData.duration)
          )
            return alert("Input has to be positive numbers");

          if (!!targetData.pace) {
            delete targetData["pace"];
          }
          if (!!targetData.cadence) {
            delete targetData["cadence"];
          }
          targetData.speed = targetData.distance / (targetData.duration / 60);
          targetData.speed;
        }

        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        let newDescription = `${
          targetData.type + "" + targetData.description.slice(7)
        }`;
        newDescription =
          newDescription[0].toUpperCase() + "" + newDescription.slice(1);
        targetData.description = newDescription;

        document.querySelector(".new--form").outerHTML = ` 
    <li class="workout workout--${targetData.type}" data-id="${targetData.id}">
    <button type="button" title="edit-btn" class="edit__btn"><span aria-hidden="true" data-name="edit" >🖋</span></button>
     <button type="button" title="delete-btn" class="delete__btn"><span aria-hidden="true" data-name="delete">×</span></button>
    <h2 class="workout__title">${targetData.description}</h2> 
    <div class="workout__details">
      <span class="workout__icon">${
        targetData.type === "running" ? "🏃" : "🚴‍♀️"
      }</span>
      <span class="workout__value">${targetData.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${targetData.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    

        ${
          targetData.type === "running"
            ? `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${targetData.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${targetData.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
</li>
`
            : ` 
<div class="workout__details">
<span class="workout__icon">⚡️</span>
<span class="workout__value">${targetData.speed.toFixed(1)}</span>
<span class="workout__unit">km/h</span>
</div>
<div class="workout__details">
<span class="workout__icon">⛰</span>
<span class="workout__value">${targetData.elevationGain}</span>
<span class="workout__unit">m</span>
</div>
</li>
`
        }
    `;
      });
  }

  #setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    // console.log(data);
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((work) => this.#renderWorkout(work));
  }

  #reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }

  deleteAll(e) {
    deleteAllBtn.style.display = "none";
    deleteConfirmation.classList.remove("hidden");
  }

  deleteAllWorkouts(e) {
    if (e.target === confirmCancelBtn) {
      deleteConfirmation.classList.add("hidden");
      deleteAllBtn.style.display = "";
    }

    if (e.target === confirmDeletBtn) {
      localStorage.removeItem("workouts");
      deleteAllBtn.style.display = "none";
      location.reload();
    }
  }
}

const app = new App();
