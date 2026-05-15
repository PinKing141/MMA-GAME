import { COUNTRIES, REGION_LABELS, WEIGHT_CLASSES } from '../lib/data.js';
import { feetInchesString, getStance, getWeightClass, getWeightClassByKey, getWeightClassEntry, inchesToFeetInchesString, state } from '../lib/core.js';
import { renderCountryBadge } from '../lib/ui/markup.js';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getSelectedWeightClass() {
    const select = document.getElementById('f-weight-class');
    return getWeightClassByKey(select?.value || getWeightClassEntry(state.setup.weight).key);
}

function getReachBounds(weightClass, heightInches) {
    return {
        min: Math.max(weightClass.reachMin, heightInches - 2),
        max: Math.min(weightClass.reachMax, heightInches + 8)
    };
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setHtml(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.innerHTML = value;
    }
}

export function renderNations() {
    const select = document.getElementById('f-nation');
    const groupOrder = ['north_america', 'latin_america', 'europe', 'asia', 'africa', 'oceania'];
    select.innerHTML = '';

    groupOrder.forEach(regionKey => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = REGION_LABELS[regionKey];

        COUNTRIES.filter(country => country.region === regionKey).forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
    });

    select.value = state.setup.country.code;
}

export function renderWeightClasses() {
    const select = document.getElementById('f-weight-class');
    select.innerHTML = WEIGHT_CLASSES.map(weightClass => `
    <option value="${weightClass.key}">${weightClass.name}</option>
  `).join('');

    select.value = getWeightClassEntry(state.setup.weight).key;
}

export function syncFrameControls({ preserveValues = true } = {}) {
    const weightClass = getSelectedWeightClass();
    const heightSlider = document.getElementById('f-height-slider');
    const reachSlider = document.getElementById('f-reach-slider');
    const weightSlider = document.getElementById('f-weight-slider');

    heightSlider.min = String(weightClass.heightMin);
    heightSlider.max = String(weightClass.heightMax);

    const currentHeight = preserveValues
        ? clamp(parseInt(heightSlider.value, 10) || (state.setup.feet * 12 + state.setup.inches), weightClass.heightMin, weightClass.heightMax)
        : clamp(state.setup.feet * 12 + state.setup.inches, weightClass.heightMin, weightClass.heightMax);
    heightSlider.value = String(currentHeight);

    const reachBounds = getReachBounds(weightClass, currentHeight);
    reachSlider.min = String(reachBounds.min);
    reachSlider.max = String(reachBounds.max);
    const currentReach = preserveValues
        ? clamp(parseInt(reachSlider.value, 10) || state.setup.reach, reachBounds.min, reachBounds.max)
        : clamp(state.setup.reach, reachBounds.min, reachBounds.max);
    reachSlider.value = String(currentReach);

    weightSlider.min = String(weightClass.min);
    weightSlider.max = String(weightClass.max);
    const currentWeight = preserveValues
        ? clamp(parseInt(weightSlider.value, 10) || state.setup.weight, weightClass.min, weightClass.max)
        : clamp(state.setup.weight, weightClass.min, weightClass.max);
    weightSlider.value = String(currentWeight);

    setText('f-height-display', inchesToFeetInchesString(currentHeight));
    setText('f-reach-display', inchesToFeetInchesString(currentReach));
    setText('f-weight-display', `${currentWeight} lbs`);
    setText('f-height-range', `${inchesToFeetInchesString(weightClass.heightMin)} - ${inchesToFeetInchesString(weightClass.heightMax)}`);
    setText('f-reach-range', `${inchesToFeetInchesString(reachBounds.min)} - ${inchesToFeetInchesString(reachBounds.max)}`);
    setText('f-weight-range', `${weightClass.min} - ${weightClass.max} lbs`);
}

export function readSetupForm() {
    const getValue = id => document.getElementById(id).value;

    state.setup.firstName = getValue('f-first').trim();
    state.setup.lastName = getValue('f-last').trim();
    state.setup.country = COUNTRIES.find(country => country.code === getValue('f-nation')) || COUNTRIES[0];
    state.setup.age = parseInt(getValue('f-age'), 10) || 20;

    const weightClass = getSelectedWeightClass();
    const heightInches = clamp(parseInt(getValue('f-height-slider'), 10) || 70, weightClass.heightMin, weightClass.heightMax);
    const reachBounds = getReachBounds(weightClass, heightInches);
    const reachInches = clamp(parseInt(getValue('f-reach-slider'), 10) || 71, reachBounds.min, reachBounds.max);
    const weight = clamp(parseInt(getValue('f-weight-slider'), 10) || 170, weightClass.min, weightClass.max);

    state.setup.feet = Math.floor(heightInches / 12);
    state.setup.inches = heightInches % 12;
    state.setup.weight = weight;
    state.setup.reach = reachInches;

    const selectedHand = document.querySelector('input[name="hand"]:checked');
    state.setup.hand = selectedHand ? selectedHand.value : 'right';
}

export function updatePreview() {
    syncFrameControls();
    readSetupForm();
    const { setup } = state;
    const fullName = [setup.firstName, setup.lastName].filter(Boolean).join(' ') || 'Unnamed Prospect';
    const heightInches = (setup.feet * 12) + setup.inches;
    const weightClass = getWeightClass(setup.weight);
    const reachText = `${inchesToFeetInchesString(setup.reach)}<span class="unit">${setup.reach} in</span>`;

    setText('pv-name', fullName);
    setHtml('pv-flag', renderCountryBadge(setup.country));
    setText('pv-class', weightClass);
    setHtml('pv-height', `${feetInchesString(setup.feet, setup.inches)}<span class="unit">${Math.round(heightInches * 2.54)} cm</span>`);
    setHtml('pv-weight', `${setup.weight}<span class="unit">lbs</span>`);
    setHtml('pv-reach', reachText);
    setText('pv-stance', getStance(setup.hand));

    setText('ff-name', fullName);
    setHtml('ff-flag', renderCountryBadge(setup.country));
    setText('ff-class', weightClass);
    setHtml('ff-height', `${feetInchesString(setup.feet, setup.inches)}<span class="unit">${Math.round(heightInches * 2.54)} cm</span>`);
    setHtml('ff-weight', `${setup.weight}<span class="unit">lbs</span>`);
    setHtml('ff-reach', reachText);
    setText('ff-stance', getStance(setup.hand));
}

export function randomiseFrame() {
    const firstNames = ['Marcus', 'Kai', 'Dmitri', 'Diego', 'Sean', 'Khabib', 'Israel', 'Aljamain', 'Demetrious', 'Petr', 'Jiri', 'Alex', 'Charles', 'Kamaru', 'Leon', 'Ilia', 'Sergei', 'Magomed', 'Cory', 'Brandon', 'Yair', 'Hiroto', 'Aung', 'Eddie', 'Conor', 'Michael', 'Robert', 'Jamahal'];
    const lastNames = ['Adesina', 'Volkanovski', 'Makhachev', 'Topuria', 'Pereira', 'Sterling', 'Oliveira', 'Usman', 'Edwards', 'Sandhagen', 'Garbrandt', 'Moreno', 'Holloway', 'Hooker', 'Prochazka', 'Pantoja', 'La Rosa', 'Pavlovich', 'Yan', 'Petrov', 'Nurmagomedov', 'McGregor', 'Aldo', 'Whittaker', 'Strickland', 'Hill'];

    document.getElementById('f-first').value = firstNames[Math.floor(Math.random() * firstNames.length)];
    document.getElementById('f-last').value = lastNames[Math.floor(Math.random() * lastNames.length)];
    document.getElementById('f-nation').value = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)].code;
    document.getElementById('f-age').value = 18 + Math.floor(Math.random() * 7);

    const weightClass = WEIGHT_CLASSES[Math.floor(Math.random() * WEIGHT_CLASSES.length)];
    document.getElementById('f-weight-class').value = weightClass.key;
    const totalInches = Math.round(weightClass.heightMin + (Math.random() * (weightClass.heightMax - weightClass.heightMin)));
    const reachBounds = getReachBounds(weightClass, totalInches);
    const weight = Math.round(weightClass.min + (Math.random() * (weightClass.max - weightClass.min)));

    document.getElementById('f-height-slider').value = String(totalInches);
    document.getElementById('f-reach-slider').value = String(Math.round(reachBounds.min + (Math.random() * (reachBounds.max - reachBounds.min))));
    document.getElementById('f-weight-slider').value = String(weight);

    const hand = Math.random() < 0.8 ? 'right' : 'left';
    document.querySelector(`input[name="hand"][value="${hand}"]`).checked = true;

    updatePreview();
}
