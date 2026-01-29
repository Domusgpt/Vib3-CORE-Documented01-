/**
 * Geometric Alpha - Application Controller
 *
 * Wires together the geometry engine, visualization, and UI controls.
 */

(function () {
    'use strict';

    // --- Engine & Visualizers ---
    const engine = new BettingGeometryEngine({ bankroll: 10000 });
    const geometryViz = new GeometryVisualizer('geometry-canvas');
    const channelVizs = [];
    for (let i = 0; i < 6; i++) {
        channelVizs.push(new ChannelVisualizer(i));
    }

    // Current opportunities (mutable for simulation)
    let currentOpportunities = [];
    let simulationInterval = null;

    // --- DOM References ---
    const btnLoadSample = document.getElementById('btn-load-sample');
    const btnSimulate = document.getElementById('btn-simulate');
    const btnRandomize = document.getElementById('btn-randomize');
    const btnClear = document.getElementById('btn-clear');
    const bankrollInput = document.getElementById('bankroll-input');
    const opportunitiesList = document.getElementById('opportunities-list');
    const decisionAction = document.getElementById('decision-action');
    const decisionDetails = document.getElementById('decision-details');
    const decisionAllocations = document.getElementById('decision-allocations');
    const attractorLabel = document.getElementById('attractor-label');
    const crystalBar = document.getElementById('crystal-bar');
    const crystalValue = document.getElementById('crystal-value');
    const energyBar = document.getElementById('energy-bar');
    const energyValue = document.getElementById('energy-value');
    const signalBar = document.getElementById('signal-bar');
    const signalValue = document.getElementById('signal-value');

    // --- Engine Callbacks ---
    engine.onUpdate = function (state) {
        // Update main visualization
        geometryViz.update(state);

        // Update channel visualizations
        if (state.portfolioState) {
            const channels = state.portfolioState.channels;
            for (let i = 0; i < 6; i++) {
                channelVizs[i].update(channels[i]);
                document.getElementById('ch-' + i + '-value').textContent = channels[i].toFixed(2);

                // Highlight active channels
                const el = document.querySelector('.channel[data-channel="' + i + '"]');
                if (el) {
                    el.classList.toggle('active', channels[i] > 0.3);
                }
            }
        }

        // Update stats
        updateStats(state);

        // Update decision panel
        updateDecision(state);

        // Update opportunities list
        updateOpportunitiesList(state);
    };

    engine.onAttractorChange = function (newAttractor, oldAttractor) {
        console.log('Attractor changed:', oldAttractor?.name, '->', newAttractor?.name);
    };

    // --- UI Update Functions ---
    function updateStats(state) {
        if (state.portfolioState) {
            var crystal = Math.round(state.portfolioState.crystallization * 100);
            crystalBar.style.width = crystal + '%';
            crystalValue.textContent = crystal + '%';

            var energy = state.portfolioState.energy;
            energyBar.style.width = Math.min(100, energy * 100) + '%';
            energyValue.textContent = energy.toFixed(2);
        } else {
            crystalBar.style.width = '0%';
            crystalValue.textContent = '0%';
            energyBar.style.width = '0%';
            energyValue.textContent = '0.00';
        }

        // Signal strength
        var signalLabel = state.signalStrength || 'NOISE';
        signalValue.textContent = signalLabel;
        var signalPercent = { STRONG: 100, MODERATE: 66, WEAK: 33, NOISE: 5 };
        signalBar.style.width = (signalPercent[signalLabel] || 5) + '%';
    }

    function updateDecision(state) {
        var action = state.action || 'WAIT';
        var attractor = state.attractor;

        // Update action display
        decisionAction.textContent = action;
        decisionAction.className = 'decision-action';
        if (action === 'EXECUTE') {
            decisionAction.classList.add('execute');
        } else if (action === 'PREPARE') {
            decisionAction.classList.add('prepare');
        } else if (action === 'PASS' || action === 'REDUCE') {
            decisionAction.classList.add('pass');
        } else {
            decisionAction.classList.add('wait');
        }

        // Update attractor badge
        if (attractor) {
            attractorLabel.textContent = attractor.name;
            attractorLabel.className = 'attractor-badge';
            var badgeMap = {
                STABLE_EDGE: 'stable',
                EMERGING_EDGE: 'emerging',
                CLOSING_WINDOW: 'closing',
                CORRELATED_CLUSTER: 'closing',
                EFFICIENT_MARKET: 'pass',
                DECAYING_EDGE: 'pass',
                UNSTABLE_CHAOS: 'chaos'
            };
            attractorLabel.classList.add(badgeMap[attractor.name] || 'pass');
        }

        // Update details
        if (attractor) {
            decisionDetails.innerHTML =
                '<p><strong>Attractor:</strong> ' + attractor.name + '</p>' +
                '<p><strong>Action:</strong> ' + attractor.action + '</p>' +
                '<p><strong>Kelly Mult:</strong> ' + attractor.kellyMult + 'x</p>' +
                '<p><strong>Signal:</strong> ' + (state.signalStrength || 'NOISE') + '</p>';
        } else {
            decisionDetails.innerHTML = '<p>Feed opportunities to generate geometric decision...</p>';
        }

        // Update allocations
        var allocations = state.allocations || [];
        if (allocations.length > 0) {
            var html = '';
            for (var i = 0; i < allocations.length; i++) {
                var a = allocations[i];
                html += '<div class="allocation-item">' +
                    '<span class="alloc-game">' + a.team + ' (' + a.betType + ' ' + a.side + ')</span>' +
                    '<span class="alloc-amount">$' + a.amount.toFixed(2) + '</span>' +
                    '<span class="alloc-edge">' + (a.edge * 100).toFixed(1) + '% edge</span>' +
                    '</div>';
            }
            decisionAllocations.innerHTML = html;
        } else {
            decisionAllocations.innerHTML = '';
        }
    }

    function updateOpportunitiesList(state) {
        var opps = state.opportunities || [];
        if (opps.length === 0) {
            opportunitiesList.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No opportunities loaded</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < opps.length; i++) {
            var opp = opps[i].opportunity;
            var edge = opp.edge || (opp.modelProb - opp.impliedProb);
            var isPositive = edge > 0;
            html += '<div class="opportunity-item ' + (isPositive ? 'positive' : 'negative') + '">' +
                '<div class="opp-game">' + opp.team + ' <small>(' + opp.betType + ' ' + opp.side + ')</small></div>' +
                '<div class="opp-edge ' + (isPositive ? 'positive' : 'negative') + '">' +
                (isPositive ? '+' : '') + (edge * 100).toFixed(1) + '%</div>' +
                '<div class="opp-confidence">Conf: ' + ((opp.confidence || 0.5) * 100).toFixed(0) + '%</div>' +
                '</div>';
        }
        opportunitiesList.innerHTML = html;
    }

    // --- Button Handlers ---
    btnLoadSample.addEventListener('click', function () {
        stopSimulation();
        currentOpportunities = generateOpportunities(SAMPLE_MLB_GAMES);
        engine.update(currentOpportunities);
    });

    btnSimulate.addEventListener('click', function () {
        if (simulationInterval) {
            stopSimulation();
            btnSimulate.textContent = 'Simulate Market Movement';
            return;
        }

        if (currentOpportunities.length === 0) {
            currentOpportunities = generateOpportunities(SAMPLE_MLB_GAMES);
        }

        btnSimulate.textContent = 'Stop Simulation';
        simulationInterval = setInterval(function () {
            currentOpportunities = simulateMarketMovement(currentOpportunities, 0.6);
            engine.update(currentOpportunities);
        }, 1000);
    });

    btnRandomize.addEventListener('click', function () {
        stopSimulation();
        currentOpportunities = generateRandomOpportunities(6);
        engine.update(currentOpportunities);
    });

    btnClear.addEventListener('click', function () {
        stopSimulation();
        currentOpportunities = [];
        engine.clear();

        // Reset UI
        opportunitiesList.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No opportunities loaded</p>';
        decisionAction.textContent = 'WAITING';
        decisionAction.className = 'decision-action wait';
        decisionDetails.innerHTML = '<p>Feed opportunities to generate geometric decision...</p>';
        decisionAllocations.innerHTML = '';
        attractorLabel.textContent = 'WAITING';
        attractorLabel.className = 'attractor-badge';
        crystalBar.style.width = '0%';
        crystalValue.textContent = '0%';
        energyBar.style.width = '0%';
        energyValue.textContent = '0.00';
        signalBar.style.width = '0%';
        signalValue.textContent = 'NOISE';

        for (var i = 0; i < 6; i++) {
            channelVizs[i].update(0);
            document.getElementById('ch-' + i + '-value').textContent = '0.00';
            var el = document.querySelector('.channel[data-channel="' + i + '"]');
            if (el) el.classList.remove('active');
        }
    });

    bankrollInput.addEventListener('change', function () {
        var val = parseFloat(bankrollInput.value);
        if (!isNaN(val) && val >= 100) {
            engine.setBankroll(val);
            if (currentOpportunities.length > 0) {
                engine.update(currentOpportunities);
            }
        }
    });

    function stopSimulation() {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
            btnSimulate.textContent = 'Simulate Market Movement';
        }
    }

    // --- Start Animation Loops ---
    geometryViz.start();

    // Channel render loop
    function renderChannels() {
        for (var i = 0; i < channelVizs.length; i++) {
            channelVizs[i].render();
        }
        requestAnimationFrame(renderChannels);
    }
    renderChannels();

    console.log('Geometric Alpha initialized. Click "Load Sample MLB Data" to begin.');
})();
